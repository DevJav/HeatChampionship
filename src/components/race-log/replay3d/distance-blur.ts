import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/addons/postprocessing/Pass.js";

/**
 * Depth of field for the far distance: the hills and the far side of the
 * circuit go soft, like a lens focused on the cars. It reads the depth the
 * scene was just drawn with, so the scene is not drawn twice. Things in
 * focus never bleed into the blur, and the sky is left as it is.
 */
export class DistanceBlurPass extends Pass {
  private quad: FullScreenQuad;
  private material: THREE.ShaderMaterial;

  constructor(private camera: THREE.PerspectiveCamera) {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        cameraNear: { value: 1 },
        cameraFar: { value: 1000 },
        start: { value: 500 },
        end: { value: 1500 },
        radius: { value: 4 },
        texel: { value: new THREE.Vector2() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tColor;
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float start;
        uniform float end;
        uniform float radius;
        uniform vec2 texel;
        varying vec2 vUv;

        // How out of focus a point is, 0 … 1; the sky stays sharp
        float blurAt(vec2 uv) {
          float depth = texture2D(tDepth, uv).x;
          if (depth >= 0.99999) return 0.0;
          float distance = -perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
          return smoothstep(start, end, distance);
        }

        void main() {
          vec4 base = texture2D(tColor, vUv);
          float k = blurAt(vUv);
          if (k < 0.01) {
            gl_FragColor = base;
            return;
          }
          vec3 sum = base.rgb;
          float total = 1.0;
          // Samples spread over a disc, by the golden angle
          for (int i = 1; i < 24; i++) {
            float r = sqrt(float(i) / 24.0);
            float a = float(i) * 2.39996;
            vec2 uv = vUv + vec2(cos(a), sin(a)) * r * k * radius * texel;
            // Weighted by their own blur, so sharp cars in front don't smear into the background
            float w = blurAt(uv);
            sum += texture2D(tColor, uv).rgb * w;
            total += w;
          }
          gl_FragColor = vec4(sum / total, base.a);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  /** Sharp up to `start` scene units from the camera, fully soft from `end` */
  setFocus(start: number, end: number) {
    this.material.uniforms.start.value = start;
    this.material.uniforms.end.value = end;
  }

  setSize(width: number, height: number) {
    this.material.uniforms.texel.value.set(1 / width, 1 / height);
    // About the same softness whatever the resolution
    this.material.uniforms.radius.value = Math.max(3, height / 120);
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const u = this.material.uniforms;
    u.tColor.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.cameraNear.value = this.camera.near;
    u.cameraFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}
