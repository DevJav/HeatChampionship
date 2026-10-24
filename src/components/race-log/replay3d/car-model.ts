import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * The race car (public/models/race-car.glb): a 1960s single-seater with its
 * driver, rigged as a tree of named parts. Each part's origin is its pivot:
 * front uprights steer about their local z, wheels roll about their local y,
 * the steering wheel turns on its column, the driver's torso leans and the
 * head turns, and the arms swing from the shoulders so the gloves stay on
 * the rim.
 *
 * The model is in millimetres, +x forward, +y left, +z up, origin on the
 * ground midway between the axles. It is turned to three.js axes (+x
 * forward, +y up, +z right) and scaled to 16 units long. The body and the
 * helmet stripes take the driver's colour.
 */

const MODEL = "/models/race-car.glb";
const LENGTH_MM = 40.06;
const MM = 16 / LENGTH_MM;
const WHEEL_RADIUS_MM = { front: 4.6, rear: 5.4 };

/** Where things are on the model, in its own units (before CAR_SCALE), for the cameras and skid marks */
export const REAR_AXLE = -11 * MM;
/** Distance from the centre line to the middle of a rear tyre */
export const REAR_TRACK = 10.5 * MM;
/** Width over the wheels */
export const CAR_WIDTH = 26.3 * MM;
/** Between the front and rear axles */
export const WHEELBASE = 22 * MM;
/** Above the driver's helmet, for the onboard camera */
export const DRIVER_EYE = { x: -2.05 * MM, y: 13.6 * MM };

/**
 * Parts big enough to matter from the trackside: only these get a cel outline
 * and cast a shadow, which keeps seven cars (57,000 triangles each) affordable.
 */
const PROMINENT = /^(chassis__body|wheel_.*__tyre|driver_head__helmet_shell|driver_torso__suit)$/;

/** Front wheels steer at most this much; the steering wheel turns several times as far */
const MAX_STEER = 0.5;
const STEERING_RATIO = 3.5;

let loading: Promise<THREE.Group> | null = null;

/** Loads the model once for every car and every world. */
export function loadCarModel() {
  loading ??= new GLTFLoader()
    .loadAsync(MODEL)
    .then((gltf) => {
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        // The file has no normals: work them out, smooth across curves and sharp at real edges
        const geometry = object.geometry as THREE.BufferGeometry;
        object.geometry = toCreasedNormals(geometry, THREE.MathUtils.degToRad(40));
        geometry.dispose();
      });
      return gltf.scene;
    })
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

export type CarPose = {
  /** Front-wheel angle, radians, positive to the left */
  steer: number;
  /** Distance covered, in scene units, for the wheels to roll */
  distance: number;
  /** Cornering force for the driver to lean against, −1 … 1, positive pushing right */
  lean: number;
  /** Arms up in celebration, 0 (hands on the wheel) … 1 (straight up) */
  cheer?: number;
};

export type CarRig = {
  /** Placed and turned to face the way the car goes */
  root: THREE.Group;
  /** Turns the whole car in a spin-out */
  spinner: THREE.Group;
  /** Pitches and rolls on the suspension */
  chassis: THREE.Group;
  pose(pose: CarPose): void;
};

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

/** A part of the rig that turns about one of its own axes from where the model has it */
function joint(object: THREE.Object3D) {
  const rest = object.quaternion.clone();
  const turn = new THREE.Quaternion();
  return {
    object,
    set(axis: THREE.Vector3, angle: number) {
      object.quaternion.copy(rest).multiply(turn.setFromAxisAngle(axis, angle));
    },
    reset() {
      object.quaternion.copy(rest);
    },
  };
}

/** Dresses copies of the model in each driver's colour; shapes and the other materials are shared. */
export function carFactory(template: THREE.Group, scale: number) {
  return {
    build(color: string): CarRig {
      const model = template.clone(true);
      const paint = new Map<THREE.Material, THREE.Material>();
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const prominent = PROMINENT.test(object.name);
        object.castShadow = prominent;
        object.receiveShadow = true;
        const material = object.material as THREE.MeshStandardMaterial;
        // Small details and the see-through windscreen get no cel outline
        if (!prominent || material.transparent) object.userData.flat = true;
        if (material.name === "body" || material.name === "stripe") {
          if (!paint.has(material)) {
            const own = material.clone();
            own.color.set(color);
            paint.set(material, own);
          }
          object.material = paint.get(material)!;
        }
      });
      const part = (name: string) => joint(model.getObjectByName(name)!);
      const uprights = ["upright_fl", "upright_fr"].map(part);
      const wheels = [
        { ...part("wheel_fl"), radius: WHEEL_RADIUS_MM.front },
        { ...part("wheel_fr"), radius: WHEEL_RADIUS_MM.front },
        { ...part("wheel_rl"), radius: WHEEL_RADIUS_MM.rear },
        { ...part("wheel_rr"), radius: WHEEL_RADIUS_MM.rear },
      ];
      const steeringWheel = part("steering_wheel");
      const torso = part("driver_torso");
      const head = part("driver_head");

      // Model axes to three.js axes, millimetres to scene units
      const axes = new THREE.Group();
      axes.rotation.x = -Math.PI / 2;
      axes.scale.setScalar(MM);
      axes.add(model);
      const chassis = new THREE.Group();
      chassis.add(axes);
      const spinner = new THREE.Group();
      spinner.scale.setScalar(scale);
      spinner.add(chassis);
      const root = new THREE.Group();
      root.add(spinner);

      // Each glove's grip, held in the steering wheel's frame so it turns with the rim
      root.updateMatrixWorld(true);
      const arms = (["l", "r"] as const).map((side) => {
        const upper = part(`upper_arm_${side}`);
        const hand = model.getObjectByName(`hand_${side}`)!;
        const grip = steeringWheel.object.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
        return { upper, hand, grip };
      });
      const shoulder = new THREE.Vector3();
      const from = new THREE.Vector3();
      const to = new THREE.Vector3();
      const chest = new THREE.Vector3();
      const raised = new THREE.Vector3();
      const parentQ = new THREE.Quaternion();
      const swing = new THREE.Quaternion();

      return {
        root,
        spinner,
        chassis,
        pose({ steer, distance, lean, cheer = 0 }) {
          const angle = THREE.MathUtils.clamp(steer, -MAX_STEER, MAX_STEER);
          for (const upright of uprights) upright.set(Z, angle);
          // Rolling forward turns the wheels about +y (pointing left) so their tops go forward
          const mm = distance / (MM * scale);
          for (const wheel of wheels) wheel.set(Y, mm / wheel.radius);
          steeringWheel.set(Z, angle * STEERING_RATIO);
          head.set(Z, angle * 1.4);
          torso.set(X, THREE.MathUtils.clamp(lean, -1, 1) * 0.18);

          // Arms: swing each from the shoulder so the glove reaches its grip on the turned rim
          for (const arm of arms) arm.upper.reset();
          root.updateMatrixWorld(true);
          torso.object.getWorldPosition(chest);
          for (const arm of arms) {
            arm.upper.object.getWorldPosition(shoulder);
            from.copy(arm.hand.getWorldPosition(to)).sub(shoulder).normalize();
            to.copy(arm.grip);
            steeringWheel.object.localToWorld(to).sub(shoulder).normalize();
            if (cheer > 0) {
              // Up and a little out to the side
              raised.set(shoulder.x - chest.x, 0, shoulder.z - chest.z).normalize().multiplyScalar(0.45);
              raised.y = 1;
              to.lerp(raised.normalize(), Math.min(1, cheer)).normalize();
            }
            swing.setFromUnitVectors(from, to);
            // Into the shoulder's parent frame
            arm.upper.object.parent!.getWorldQuaternion(parentQ);
            swing.premultiply(parentQ.clone().invert()).multiply(parentQ);
            arm.upper.object.quaternion.premultiply(swing);
          }
        },
      };
    },
    dispose() {},
  };
}
