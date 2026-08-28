// Vista "Historial": lista todas las evaluaciones con filtros y abre
// el modal de feedback al hacer clic en una fila.

const Historial = (function () {
  let selectEquipo;
  let selectAsesor;
  let inputDesde;
  let inputHasta;
  let tabla;

  function iniciar() {
    selectEquipo = document.getElementById("historial-filtro-equipo");
    selectAsesor = document.getElementById("historial-filtro-asesor");
    inputDesde = document.getElementById("historial-filtro-desde");
    inputHasta = document.getElementById("historial-filtro-hasta");
    tabla = document.getElementById("historial-tabla");

    actualizarSelectores();

    [selectEquipo, selectAsesor, inputDesde, inputHasta].forEach(function (el) {
      el.addEventListener("change", render);
    });

    render();
  }

  function actualizarSelectores() {
    const equipoActual = selectEquipo.value;
    const asesorActual = selectAsesor.value;

    selectEquipo.innerHTML = '<option value="">Todos</option>';
    Datos.obtenerEquipos().forEach(function (equipo) {
      const opcion = document.createElement("option");
      opcion.value = equipo.id;
      opcion.textContent = equipo.nombre;
      selectEquipo.appendChild(opcion);
    });
    selectEquipo.value = equipoActual;

    selectAsesor.innerHTML = '<option value="">Todos</option>';
    Datos.obtenerAsesores().forEach(function (asesor) {
      const opcion = document.createElement("option");
      opcion.value = asesor.id;
      opcion.textContent = asesor.nombre;
      selectAsesor.appendChild(opcion);
    });
    selectAsesor.value = asesorActual;
  }

  function filtroActual() {
    return {
      equipoId: selectEquipo.value || null,
      asesorId: selectAsesor.value || null,
      desde: inputDesde.value || null,
      hasta: inputHasta.value || null,
    };
  }

  function render() {
    const filtro = filtroActual();
    const evaluaciones = Datos.evaluacionesFiltradas(filtro)
      .slice()
      .sort(function (a, b) {
        return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0;
      });

    tabla.innerHTML = "";

    if (evaluaciones.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "empty-state";
      td.textContent = "No hay evaluaciones para estos filtros.";
      tr.appendChild(td);
      tabla.appendChild(tr);
      return;
    }

    evaluaciones.forEach(function (ev) {
      const asesor = Datos.obtenerAsesorPorId(ev.asesorId);
      const equipo = asesor ? Datos.obtenerEquipoPorId(asesor.equipoId) : null;
      const resultado = Datos.calcularScore(ev.criterios);

      const tr = document.createElement("tr");
      tr.className = "is-clickable";
      tr.title = "Ver feedback de esta llamada";

      tr.appendChild(celda(Datos.formatearFecha(ev.fecha)));
      tr.appendChild(celda(asesor ? asesor.nombre : "-"));
      tr.appendChild(celda(equipo ? equipo.nombre : "-"));
      tr.appendChild(celda(ev.evaluador));

      const tdScore = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge badge-" + Datos.clasificarScore(resultado.score);
      badge.textContent = resultado.score;
      tdScore.appendChild(badge);
      tr.appendChild(tdScore);

      const tdAccion = document.createElement("td");
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn btn-outline";
      boton.textContent = "Ver feedback";
      boton.addEventListener("click", function (evento) {
        evento.stopPropagation();
        Feedback.abrir(ev);
      });
      tdAccion.appendChild(boton);
      tr.appendChild(tdAccion);

      tr.addEventListener("click", function () {
        Feedback.abrir(ev);
      });

      tabla.appendChild(tr);
    });
  }

  function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  return { iniciar: iniciar, render: render, actualizarSelectores: actualizarSelectores };
})();
