# Novedades

Lo nuevo de la web, de lo más reciente a lo más antiguo. Es la misma lista que la página **Novedades** de la web (`/novedades`); la versión en inglés es [CHANGELOG.md](CHANGELOG.md).

Las versiones son `MAYOR.MENOR.PARCHE`: una versión menor nueva trae funciones nuevas, un parche trae arreglos y pequeños retoques. La 1.0.0 fue la primera versión que usó la liga.

## [Sin publicar]

### Arreglos
- Los nombres de pilotos mencionados en los artículos encajan mejor en el texto: la franja de color ya no se pega a la palabra anterior, y las comas y los puntos van pegados al nombre.

## [1.15.0] - 2026-11-09

### Nuevo
- Los artículos pueden tener formato de **entrevista**: una **P** roja marca cada pregunta y una **R** del color del coche del piloto marca cada respuesta, así que se ve bien quién habla en cada momento.

## [1.14.1] - 2026-11-08

### Cambios
- Una carrera ya puede tener hasta **12 plazas** en lugar de 8.

## [1.14.0] - 2026-11-05

### Nuevo
- **Japón** ya se puede anotar ronda a ronda: sus páginas de carrera tienen el gráfico de vueltas, la repetición y las estadísticas de la carrera, y su página de circuito muestra el **Mapa del circuito**, con la recta de salida dibujada como un puente sobre el tramo que pasa por debajo.
- **Países Bajos** también se puede anotar ronda a ronda, con el gráfico de vueltas, la repetición, las estadísticas de la carrera y el **Mapa del circuito** en su página de circuito.
- **México** también: gráfico de vueltas, repetición, estadísticas de la carrera y su **Mapa del circuito**.

### Cambios
- Se han retocado los mapas de **Estados Unidos**, **Italia**, **Gran Bretaña** y **España**: la pista y sus casillas siguen mejor el tablero.

## [1.13.1] - 2026-11-05

### Nuevo
- **España** también se puede anotar ronda a ronda: su única vuelta larga, túneles incluidos, tiene el gráfico de vueltas, la repetición y las estadísticas de la carrera, y su página de circuito muestra el **Mapa del circuito**.

## [1.13.0] - 2026-11-05

### Nuevo
- Ya se pueden anotar **Gran Bretaña** e **Italia** ronda a ronda, como Estados Unidos y Francia: sus páginas de carrera tienen el gráfico de vueltas, la repetición y las estadísticas de la carrera, y sus páginas de circuito muestran el **Mapa del circuito**.

### Cambios
- Se ha retocado el mapa de **Estados Unidos**: la pista y sus casillas siguen mejor el tablero, y el límite de velocidad de una curva está mejor colocado.

## [1.12.1] - 2026-11-04

### Arreglos
- En el móvil, la tarjeta **Lucha por el título** de la página de **Clasificación** ya no se sale de la pantalla ni hace que toda la página se desplace de lado: la diferencia y el máximo de puntos de cada piloto aparecen ahora bajo su nombre.
- En los móviles más estrechos, la cabecera ya no hace que todas las páginas se desplacen de lado cuando has iniciado sesión: el nombre de la web pasa a dos líneas cuando hace falta.
- En el móvil, las páginas de **Estadísticas** y **Pilotos** tampoco se desplazan ya de lado.
- En el móvil, la tarjeta **Líder** de la página de **Clasificación** ocupa ahora todo el ancho, así que los nombres largos ya no se cortan.

## [1.12.0] - 2026-11-03

### Nuevo
- Las páginas de circuito muestran ahora el **Mapa del circuito** cuando lo tiene (de momento, Estados Unidos y Francia): el mismo dibujo que al anotar las carreras, con sus curvas, sus límites de velocidad y las casillas que faltan hasta cada curva.

## [1.11.1] - 2026-10-26

### Cambios
- En la tabla de la **Clasificación**, cada columna de carrera muestra ahora la bandera del circuito junto a R1, R2…, para ver de un vistazo dónde se corrió cada carrera (pasa el ratón por encima para ver el nombre del circuito). Unas líneas finas separan ahora los puntos, la diferencia/victorias/podios y las carreras, y ya no salen las flechas de puestos ganados o perdidos desde la última carrera.
- En móviles y tablets, la tabla de la **Clasificación** muestra ahora también cada carrera: desliza la tabla hacia los lados para verlas.

## [1.11.0] - 2026-10-25

### Nuevo
- Cada circuito tiene su propia página: cuántas carreras se han corrido allí, el rey del circuito, cuántas veces gana el que sale primero, la mayor remontada, el historial de cada piloto en él, todas las carreras disputadas y las próximas que hay en ese circuito. Están todos en **Circuitos**, en la página de Carreras, o tocando el nombre del circuito en una carrera o en la tabla de circuitos de Estadísticas.

### Cambios
- La columna **Adel.** de los datos de una carrera anotada cuenta ahora cada coche que adelanta un piloto, aunque luego le vuelvan a pasar en la misma ronda. Antes contaba las posiciones ganadas en cada ronda, así que adelantar a dos y perder un puesto contaba como uno.

### Eliminado
- La tarjeta **Curvas** de las carreras anotadas: apuntar cada adelantamiento a todo el tramo entre dos curvas no decía gran cosa de dónde se adelanta de verdad.

### Arreglos
- En los mapas del circuito (anotar y repetición), las casillas ahora siguen la curva de la pista en vez de cortarla en línea recta, lo que dejaba huecos oscuros en las curvas cerradas.
- En el móvil, la sección del circuito de una carrera próxima ya no hace que toda la página se desplace de lado.

## [1.10.0] - 2026-10-24

### Nuevo
- **Francia** ya se puede anotar ronda a ronda, como Estados Unidos: su carrera tendrá gráfico de vueltas, repetición y estadísticas de carrera.

### Cambios
- Para administradores que anotan una carrera: el mapa muestra junto a cada casilla cuántas quedan hasta la siguiente curva, los mismos números que en el tablero, para encontrar más fácil dónde ha acabado cada coche.

## [1.9.0] - 2026-10-23

### Nuevo
- Las carreras se pueden anunciar solo con el mes mientras el día está por decidir. Se ven como "diciembre 2026 · fecha por decidir", con un botón **Elegir fecha** en la página de la carrera que lleva a la encuesta de fecha; la cuenta atrás y la invitación al calendario aparecen cuando ya hay día. Para administradores: marca **Fecha por decidir** en el formulario de la carrera y elige el mes, y después usa **Programar carrera** en la encuesta para darle día.

### Cambios
- **¿Cuándo corremos?** Ahora también cuentan los pilotos que aún no han corrido: salen en **Sin responder todavía** y en el número de pilotos que han respondido.

### Arreglos
- **Noticias:** los artículos van ahora sobre una hoja blanca lisa bajo el título, en vez de sobre el fondo de rayas, así se leen mejor.

## [1.8.0] - 2026-10-23

### Nuevo
- **¿Cuándo corremos?** Ayuda a elegir la fecha de la próxima carrera: cuando el organizador abra una encuesta, marca cada día como *Puedo*, *Quizá* o *No puedo* con un toque, o rellena de golpe todos los días que te falten. **Mejores días** muestra los días que más pilotos pueden y quién falta. Entra desde el aviso de la portada o desde **Elegir fecha** en Carreras; si recibes los correos de carreras, te llegará uno cuando se abra una encuesta.
- Para administradores: abre una encuesta de uno a tres meses, bloquea los días que no puedas y pulsa **Programar carrera** en cualquier día para crear una carrera en esa fecha o mover allí una que ya esté programada (el plazo de inscripción se mueve con ella). Al guardar la carrera, se cierra la encuesta.

## [1.7.0] - 2026-10-23

### Nuevo
- **Piloto del día:** los administradores pueden cerrar la votación antes de tiempo (por ejemplo, cuando ya han votado todos) y el ganador se anuncia en el momento.

### Cambios
- Las fotos de la carrera muestran quién subió cada una, y el pie de foto completo en vez de cortarlo.

### Arreglos
- **Radio del equipo:** ya no se corta la última letra del nombre de algunos pilotos, y los nombres largos tienen más sitio.
- Los nombres largos ya no hacen que la clasificación de la portada se desplace de lado, y tu nombre en la barra de arriba ocupa una sola línea; ambos se acortan con "…".

## [1.6.1] - 2026-10-19

### Cambios
- **Pronóstico del podio:** haces o cambias tu pronóstico en una ventana emergente, y los pronósticos de todos se ven en la página de la carrera en cuanto se hacen, ya no se ocultan hasta la salida.

## [1.6.0] - 2026-10-19

### Nuevo
- Esta página de **Novedades**, enlazada desde el número de versión al pie de todas las páginas.

## [1.5.1] - 2026-10-19

### Cambios
- La próxima carrera de la portada muestra el día de la semana junto a la fecha.

### Arreglos
- Los gráficos, la repetición de la carrera y el gráfico de vueltas caben en pantallas de móvil estrechas en vez de salirse por el lado.
- La página de una carrera próxima ya no se desborda en el móvil.

## [1.5.0] - 2026-10-16

### Nuevo
- **Resumen de temporada:** una página estilo Wrapped para cada piloto y temporada, enlazada desde el perfil. Tus números, tu mejor día, tu mayor remontada, tu némesis y tu víctima favorita, tu coche y circuito favoritos, trompos, rebufos, premios al piloto del día, puntos de predicción y los logros que conseguiste.
- **Radio del equipo:** después de una carrera que corriste, deja una frase corta sobre ella (hasta 140 caracteres). Sale bajo los resultados, como en la radio de la tele, y puedes cambiarla o borrarla después.
- **Datos para crónica** para los organizadores: una descarga por carrera con todo lo necesario para escribir su crónica o su previa.

## [1.4.0] - 2026-10-16

### Nuevo
- **Piloto del día:** durante una semana después de los resultados, los pilotos de la carrera votan a otro piloto de esa carrera. El recuento queda oculto hasta que se cierra la votación; el ganador recibe un aviso y un logro.
- **Predicciones de podio:** hasta que empieza la carrera, cualquiera de la liga puede elegir el top tres, incluido él mismo. 3 puntos por cada posición exacta y 1 por un piloto del podio en otra posición. Las predicciones son secretas hasta la salida. La clasificación incluye la tabla del **Oráculo** de la temporada, con logros para quien acierte un podio exacto y para el mejor pronosticador de la temporada.
- **Probabilidades:** las carreras próximas muestran las opciones de victoria y de podio de cada piloto confirmado, calculadas con su forma reciente y su historial en el circuito.
- **Lucha por el título:** mientras una temporada está en marcha, la clasificación muestra los puntos que quedan, quién puede ser campeón todavía y qué necesita el líder en la próxima carrera para cerrarlo.

### Cambios
- Al compartir una carrera, la vista previa del enlace muestra la parrilla antes de la carrera y el podio después.

## [1.3.0] - 2026-10-16

### Nuevo
- **Registro vuelta a vuelta:** el organizador puede anotar una carrera desde el móvil en la mesa, tocando dónde acaba cada coche en cada ronda. Al terminar, la hoja de resultados se rellena sola.
- Las carreras anotadas tienen **repetición** sobre el mapa del circuito, **gráfico de vueltas**, números de cada piloto (adelantamientos, rebufos, trompos, rondas en cabeza) y descargas en **JSON / CSV**.
- **Momento de la carrera** (la mayor subida en una sola ronda) y **rivalidad de la carrera** (la pareja que más veces se intercambió la posición).
- **Mapa de calor de curvas:** dónde hubo adelantamientos, rebufos y trompos, curva a curva.
- **Vídeo de la repetición**, grabado en tu navegador y listo para mandar por WhatsApp desde el móvil.
- Cuatro logros nuevos: *De principio a fin*, *Al último suspiro*, *Trompo y podio* y *Rey del rebufo*.
- La tabla de cara a cara cuenta cuántas veces se intercambiaron la posición dos pilotos en las carreras anotadas.

## [1.2.0] - 2026-10-15

### Nuevo
- **Correos** (opcionales): añade tu dirección en el perfil y elige de qué quieres enterarte: carreras nuevas, resultados o noticias. Cada correo tiene un enlace para darte de baja con un clic.
- La web puede funcionar **en inglés** para las ligas que lo prefieran.
- Guías para quien quiera montar su propia liga, y licencia MIT.

## [1.1.0] - 2026-10-15

### Nuevo
- **Noticias:** previas, crónicas, novedades y reglamento del organizador. Los artículos pueden incluir tarjetas de carrera en directo, resultados, podios, clasificaciones y fichas de piloto, además de imágenes y una foto de portada.
- **Menciones:** escribe `@usuario` para enlazar a un piloto.
- **Comentarios** en los artículos, con respuestas.
- **Campana de avisos:** cuando alguien te menciona, te responde o se publican los resultados de una carrera que corriste.
- **Actividad:** nuevos pilotos, carreras, inscripciones, resultados, fotos y temporadas, también en la portada.
- Al compartir un artículo, el enlace muestra una imagen de vista previa.

## [1.0.0] - 2026-10-14

La primera versión que usó la liga.

### Nuevo
- **Bienvenida** después de registrarte: foto, color favorito y biografía.
- **Trompos:** cada resultado anota cuántos trompos hizo el piloto, con el récord de *Más trompos* y el logro *Trompo*.
- **Calendario de carreras:** la página de carreras tiene un calendario mes a mes además de la lista.
- Las carreras se pueden anunciar como **Próximamente** antes de abrir la inscripción.
- Tu nombre aparece resaltado allá donde salga, y tu línea destaca en el gráfico de puntos.

### Cambios
- En Heat todo el mundo termina, así que se acabaron los abandonos: todos los resultados tienen posición.
- Los pilotos sin foto llevan un casco con su inicial, y tu avatar en la cabecera toma tu color favorito.
- Logo nuevo: un cuentarrevoluciones cuya aguja sube hasta la zona roja.
- Nueva cuenta atrás para la carrera.

## [0.2.0] - 2026-10-13

### Nuevo
- **Logros:** trofeos de temporada para el top tres y medallas como *Desde el fondo*, *Hat-trick* o *Trotamundos*, calculados a partir de los resultados.
- **Compartir:** manda una carrera por WhatsApp, copia su enlace o añádela a tu calendario. Los enlaces compartidos muestran una imagen de vista previa.
- **Historial del circuito** en las carreras próximas: ganadores anteriores, el rey del circuito, la mayor remontada y el historial de cada inscrito allí.
- **Cuenta atrás LED** para la próxima carrera en la portada, y una barra fina de la temporada arriba.
- La bandera del país del circuito en la cabecera de cada carrera.
- Añade la web a la pantalla de inicio del móvil, con su propio icono.
- Los organizadores pueden renombrar pilotos, cambiar contraseñas y gestionar administradores.

### Cambios
- El podio destaca en la clasificación y en los resultados de cada carrera.
- La lista de carreras es una columna de filas de cronometraje, cada una con su podio.

## [0.1.0] - 2026-10-13

La primera versión.

### Nuevo
- Cuentas para cada piloto.
- Carreras con inscripción, plazas limitadas y lista de espera automática.
- Resultados con puntos, podio y fotos de la carrera.
- Clasificación con desempate por posiciones y gráfico de puntos.
- Perfiles de piloto con números de carrera deportiva, forma e historial.
- Estadísticas: récords, cara a cara, victorias por posición de salida, circuitos, colores de coche y cartas de mejora.

[Sin publicar]: https://github.com/DevJav/HeatChampionship/compare/v1.15.0...HEAD
[1.15.0]: https://github.com/DevJav/HeatChampionship/compare/v1.14.1...v1.15.0
[1.14.1]: https://github.com/DevJav/HeatChampionship/compare/v1.14.0...v1.14.1
[1.14.0]: https://github.com/DevJav/HeatChampionship/compare/v1.13.1...v1.14.0
[1.13.1]: https://github.com/DevJav/HeatChampionship/compare/v1.13.0...v1.13.1
[1.13.0]: https://github.com/DevJav/HeatChampionship/compare/v1.12.1...v1.13.0
[1.12.1]: https://github.com/DevJav/HeatChampionship/compare/v1.12.0...v1.12.1
[1.12.0]: https://github.com/DevJav/HeatChampionship/compare/v1.11.1...v1.12.0
[1.11.1]: https://github.com/DevJav/HeatChampionship/compare/v1.11.0...v1.11.1
[1.11.0]: https://github.com/DevJav/HeatChampionship/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/DevJav/HeatChampionship/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/DevJav/HeatChampionship/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/DevJav/HeatChampionship/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/DevJav/HeatChampionship/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/DevJav/HeatChampionship/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/DevJav/HeatChampionship/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/DevJav/HeatChampionship/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/DevJav/HeatChampionship/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/DevJav/HeatChampionship/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/DevJav/HeatChampionship/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/DevJav/HeatChampionship/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/DevJav/HeatChampionship/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/DevJav/HeatChampionship/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/DevJav/HeatChampionship/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DevJav/HeatChampionship/releases/tag/v0.1.0
