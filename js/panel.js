// Vista "Panel": KPIs, gráficos de evolución y por equipo, y ranking
// de asesores. Todo se recalcula en base a los filtros activos.

const Panel = (function () {
  let selectEquipo;
  let selectAsesor;
  let inputDesde;
  let inputHasta;
  let kpiGrid;
  let tablaAsesores;
  let chartEvolucion;
  let chartEquipos;

  const COLOR_PRIMARIO = "#2e5f63";
  const COLOR_ACENTO = "#d97757";

  function iniciar() {
    selectEquipo = document.getElementById("panel-filtro-equipo");
    selectAsesor = document.getElementById("panel-filtro-asesor");
    inputDesde = document.getElementById("panel-filtro-desde");
    inputHasta = document.getElementById("panel-filtro-hasta");
    kpiGrid = document.getElementById("panel-kpis");
    tablaAsesores = document.getElementById("panel-tabla-asesores");

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
    renderKpis(filtro);
    renderTablaAsesores(filtro);
    renderGraficoEvolucion(filtro);
    renderGraficoEquipos(filtro);
  }

  function renderKpis(filtro) {
    const m = Datos.metricasGenerales(filtro);
    const porEquipo = Datos.metricasPorEquipo(filtro);
    const mejorEquipo = porEquipo.slice().sort(function (a, b) {
      return b.scorePromedio - a.scorePromedio;
    })[0];

    kpiGrid.innerHTML = "";
    agregarKpi("Score promedio", m.scorePromedio + " / 100", null);
    agregarKpi("Evaluaciones realizadas", String(m.cantidadEvaluaciones), null);
    agregarKpi(
      "Sin error crítico",
      m.porcentajeSinErrorCritico + "%",
      m.cantidadErroresCriticos + " con error crítico"
    );
    agregarKpi(
      "Mejor equipo",
      mejorEquipo ? mejorEquipo.nombre : "-",
      mejorEquipo ? mejorEquipo.scorePromedio + " pts promedio" : null
    );
  }

  function agregarKpi(label, valor, hint) {
    const div = document.createElement("div");
    div.className = "kpi-card";

    const labelEl = document.createElement("div");
    labelEl.className = "kpi-card__label";
    labelEl.textContent = label;

    const valorEl = document.createElement("div");
    valorEl.className = "kpi-card__value";
    valorEl.textContent = valor;

    div.appendChild(labelEl);
    div.appendChild(valorEl);

    if (hint) {
      const hintEl = document.createElement("div");
      hintEl.className = "kpi-card__hint";
      hintEl.textContent = hint;
      div.appendChild(hintEl);
    }

    kpiGrid.appendChild(div);
  }

  function renderTablaAsesores(filtro) {
    const filas = Datos.metricasPorAsesor(filtro);
    tablaAsesores.innerHTML = "";

    if (filas.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "empty-state";
      td.textContent = "No hay evaluaciones para estos filtros.";
      tr.appendChild(td);
      tablaAsesores.appendChild(tr);
      return;
    }

    filas.forEach(function (fila) {
      const tr = document.createElement("tr");

      tr.appendChild(celda(fila.nombre));
      tr.appendChild(celda(fila.equipoNombre));
      tr.appendChild(celda(String(fila.cantidadEvaluaciones)));

      const tdScore = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge badge-" + Datos.clasificarScore(fila.scorePromedio);
      badge.textContent = fila.scorePromedio;
      tdScore.appendChild(badge);
      tr.appendChild(tdScore);

      const tdTendencia = document.createElement("td");
      tdTendencia.textContent = textoTendencia(fila.tendencia);
      tr.appendChild(tdTendencia);

      tr.appendChild(
        celda(fila.ultimaFecha ? Datos.formatearFecha(fila.ultimaFecha) : "-")
      );

      tablaAsesores.appendChild(tr);
    });
  }

  function textoTendencia(valor) {
    if (valor > 0) {
      return "↑ +" + valor;
    }
    if (valor < 0) {
      return "↓ " + valor;
    }
    return "→ estable";
  }

  function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  function renderGraficoEvolucion(filtro) {
    const serie = Datos.serieTemporal(filtro);
    const contexto = document.getElementById("grafico-evolucion").getContext("2d");

    const labels = serie.map(function (punto) {
      return Datos.formatearFecha(punto.semana);
    });
    const valores = serie.map(function (punto) {
      return punto.scorePromedio;
    });

    if (chartEvolucion) {
      chartEvolucion.destroy();
    }

    chartEvolucion = new Chart(contexto, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Score promedio",
            data: valores,
            borderColor: COLOR_PRIMARIO,
            backgroundColor: "rgba(46, 95, 99, 0.12)",
            tension: 0.3,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100 },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  function renderGraficoEquipos(filtro) {
    const filtroSinEquipo = Object.assign({}, filtro, { equipoId: null });
    const filas = Datos.metricasPorEquipo(filtroSinEquipo);
    const contexto = document.getElementById("grafico-equipos").getContext("2d");

    if (chartEquipos) {
      chartEquipos.destroy();
    }

    chartEquipos = new Chart(contexto, {
      type: "bar",
      data: {
        labels: filas.map(function (f) {
          return f.nombre;
        }),
        datasets: [
          {
            label: "Score promedio",
            data: filas.map(function (f) {
              return f.scorePromedio;
            }),
            backgroundColor: COLOR_ACENTO,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100 },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  return { iniciar: iniciar, render: render, actualizarSelectores: actualizarSelectores };
})();
