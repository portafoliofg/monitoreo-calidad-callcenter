// Vista "Nueva evaluación": arma el listado de criterios, calcula el
// score en vivo mientras se completa y guarda la evaluación al enviar.

const VistaEvaluacion = (function () {
  let selectAsesor;
  let selectEvaluador;
  let inputFecha;
  let listaCriterios;
  let textareaComentario;
  let scoreLiveEl;
  let scoreLiveValor;
  let scoreLiveAviso;
  let form;

  function iniciar() {
    selectAsesor = document.getElementById("eval-asesor");
    selectEvaluador = document.getElementById("eval-evaluador");
    inputFecha = document.getElementById("eval-fecha");
    listaCriterios = document.getElementById("lista-criterios");
    textareaComentario = document.getElementById("eval-comentario");
    scoreLiveEl = document.getElementById("score-live");
    scoreLiveValor = document.getElementById("score-live-valor");
    scoreLiveAviso = document.getElementById("score-live-aviso");
    form = document.getElementById("form-evaluacion");

    poblarSelectores();
    poblarCriterios();
    establecerFechaHoy();
    actualizarScore();

    form.addEventListener("submit", manejarEnvio);
    document
      .getElementById("btn-cancelar-eval")
      .addEventListener("click", function () {
        poblarCriterios();
        textareaComentario.value = "";
        actualizarScore();
      });
  }

  function establecerFechaHoy() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    inputFecha.value = anio + "-" + mes + "-" + dia;
  }

  function poblarSelectores() {
    const asesores = Datos.obtenerAsesores();
    selectAsesor.innerHTML = "";
    asesores.forEach(function (asesor) {
      const equipo = Datos.obtenerEquipoPorId(asesor.equipoId);
      const opcion = document.createElement("option");
      opcion.value = asesor.id;
      opcion.textContent =
        asesor.nombre + (equipo ? " · " + equipo.nombre : "");
      selectAsesor.appendChild(opcion);
    });

    const evaluadores = Datos.obtenerEstado().evaluadores || [];
    selectEvaluador.innerHTML = "";
    evaluadores.forEach(function (nombre) {
      const opcion = document.createElement("option");
      opcion.value = nombre;
      opcion.textContent = nombre;
      selectEvaluador.appendChild(opcion);
    });
  }

  function poblarCriterios() {
    const criterios = Datos.obtenerCriterios();
    listaCriterios.innerHTML = "";

    criterios.forEach(function (criterio) {
      const item = document.createElement("div");
      item.className = "criterio-item";
      item.dataset.criterioId = criterio.id;

      const head = document.createElement("div");
      head.className = "criterio-item__head";

      const nombre = document.createElement("span");
      nombre.className = "criterio-item__nombre";
      nombre.textContent = criterio.nombre;

      const peso = document.createElement("span");
      peso.className = "criterio-item__peso";
      peso.textContent = "Peso: " + criterio.peso + "%";

      head.appendChild(nombre);
      head.appendChild(peso);

      const desc = document.createElement("p");
      desc.className = "criterio-item__desc";
      desc.textContent = criterio.descripcion;

      const controls = document.createElement("div");
      controls.className = "criterio-item__controls";

      const sliderWrap = document.createElement("div");
      sliderWrap.className = "criterio-item__slider";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.step = "5";
      slider.value = "85";
      slider.className = "input-slider";
      slider.setAttribute("aria-label", "Puntaje para " + criterio.nombre);

      const salida = document.createElement("output");
      salida.textContent = slider.value;

      slider.addEventListener("input", function () {
        salida.textContent = slider.value;
        actualizarScore();
      });

      sliderWrap.appendChild(slider);
      sliderWrap.appendChild(salida);

      const criticoWrap = document.createElement("label");
      criticoWrap.className = "criterio-item__critico";

      const criticoCheckbox = document.createElement("input");
      criticoCheckbox.type = "checkbox";
      criticoCheckbox.addEventListener("change", function () {
        item.classList.toggle("is-critico", criticoCheckbox.checked);
        actualizarScore();
      });

      criticoWrap.appendChild(criticoCheckbox);
      criticoWrap.appendChild(document.createTextNode("Error crítico"));

      controls.appendChild(sliderWrap);
      controls.appendChild(criticoWrap);

      item.appendChild(head);
      item.appendChild(desc);
      item.appendChild(controls);

      listaCriterios.appendChild(item);
    });
  }

  function leerCriteriosDelFormulario() {
    const items = listaCriterios.querySelectorAll(".criterio-item");
    const resultado = [];
    items.forEach(function (item) {
      const slider = item.querySelector('input[type="range"]');
      const checkbox = item.querySelector('input[type="checkbox"]');
      resultado.push({
        criterioId: item.dataset.criterioId,
        puntaje: Number(slider.value),
        errorCritico: checkbox.checked,
      });
    });
    return resultado;
  }

  function actualizarScore() {
    const criteriosEvaluacion = leerCriteriosDelFormulario();
    const resultado = Datos.calcularScore(criteriosEvaluacion);
    scoreLiveValor.textContent = resultado.score;
    scoreLiveEl.classList.toggle("is-critico", resultado.tieneErrorCritico);
    scoreLiveAviso.textContent = resultado.tieneErrorCritico
      ? "Score llevado a 0 por error crítico marcado."
      : "";
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    const criteriosEvaluacion = leerCriteriosDelFormulario();
    const nuevaEvaluacion = {
      asesorId: selectAsesor.value,
      evaluador: selectEvaluador.value,
      fecha: inputFecha.value,
      criterios: criteriosEvaluacion,
      comentarioGeneral: textareaComentario.value.trim(),
    };

    const guardada = Datos.agregarEvaluacion(nuevaEvaluacion);
    Toast.mostrar("Evaluación guardada.");

    Panel.actualizarSelectores();
    Panel.render();
    Historial.actualizarSelectores();
    Historial.render();

    Feedback.abrir(guardada);

    poblarCriterios();
    textareaComentario.value = "";
    establecerFechaHoy();
    actualizarScore();
  }

  return { iniciar: iniciar, actualizarScore: actualizarScore };
})();
