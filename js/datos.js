// Capa de datos: carga el seed, calcula scores y expone consultas
// agregadas para el panel, el formulario y el historial.

const Datos = (function () {
  let estado = null;

  async function cargarSeedOriginal() {
    try {
      const respuesta = await fetch("data/seed.json");
      if (!respuesta.ok) {
        throw new Error("Respuesta no exitosa al pedir seed.json");
      }
      return await respuesta.json();
    } catch (error) {
      console.info(
        "No se pudo cargar data/seed.json por fetch (esperable si abriste " +
          "index.html directo desde el disco). Se usan los datos embebidos.",
        error
      );
      return SEED_FALLBACK;
    }
  }

  async function inicializar() {
    const guardado = Storage.leer();
    if (guardado) {
      estado = guardado;
      return estado;
    }
    const seed = await cargarSeedOriginal();
    estado = clonar(seed);
    Storage.guardar(estado);
    return estado;
  }

  async function restablecer() {
    Storage.limpiar();
    const seed = await cargarSeedOriginal();
    estado = clonar(seed);
    Storage.guardar(estado);
    return estado;
  }

  function clonar(objeto) {
    return JSON.parse(JSON.stringify(objeto));
  }

  function persistir() {
    Storage.guardar(estado);
  }

  function obtenerEstado() {
    return estado;
  }

  function obtenerCriterios() {
    return estado.criterios;
  }

  function obtenerEquipos() {
    return estado.equipos;
  }

  function obtenerAsesores() {
    return estado.asesores;
  }

  function obtenerAsesorPorId(asesorId) {
    return estado.asesores.find(function (a) {
      return a.id === asesorId;
    });
  }

  function obtenerEquipoPorId(equipoId) {
    return estado.equipos.find(function (e) {
      return e.id === equipoId;
    });
  }

  function obtenerEvaluaciones() {
    return estado.evaluaciones;
  }

  function obtenerEvaluacionPorId(evaluacionId) {
    return estado.evaluaciones.find(function (e) {
      return e.id === evaluacionId;
    });
  }

  // Suma ponderada de puntajes según el peso de cada criterio.
  // Si algún criterio quedó marcado como error crítico, el score final
  // se lleva a 0, siguiendo la política habitual de QA en call centers.
  function calcularScore(criteriosEvaluacion) {
    let tieneErrorCritico = false;
    let acumulado = 0;

    criteriosEvaluacion.forEach(function (item) {
      if (item.errorCritico) {
        tieneErrorCritico = true;
      }
      const def = estado.criterios.find(function (c) {
        return c.id === item.criterioId;
      });
      if (def) {
        acumulado += (item.puntaje * def.peso) / 100;
      }
    });

    const score = tieneErrorCritico ? 0 : Math.round(acumulado);
    return { score: score, tieneErrorCritico: tieneErrorCritico };
  }

  function clasificarScore(score) {
    if (score >= 80) {
      return "alto";
    }
    if (score >= 60) {
      return "medio";
    }
    return "bajo";
  }

  function generarIdEvaluacion() {
    const numero = estado.evaluaciones.length + 1;
    const numeroTexto = String(numero).padStart(4, "0");
    return "ev-" + numeroTexto;
  }

  function agregarEvaluacion(evaluacion) {
    const conId = Object.assign({ id: generarIdEvaluacion() }, evaluacion);
    estado.evaluaciones.push(conId);
    persistir();
    return conId;
  }

  function evaluacionesFiltradas(filtro) {
    filtro = filtro || {};
    return estado.evaluaciones.filter(function (ev) {
      if (filtro.equipoId) {
        const asesor = obtenerAsesorPorId(ev.asesorId);
        if (!asesor || asesor.equipoId !== filtro.equipoId) {
          return false;
        }
      }
      if (filtro.asesorId && ev.asesorId !== filtro.asesorId) {
        return false;
      }
      if (filtro.desde && ev.fecha < filtro.desde) {
        return false;
      }
      if (filtro.hasta && ev.fecha > filtro.hasta) {
        return false;
      }
      return true;
    });
  }

  function scoreDeEvaluacion(evaluacion) {
    return calcularScore(evaluacion.criterios).score;
  }

  function promedio(numeros) {
    if (numeros.length === 0) {
      return 0;
    }
    const suma = numeros.reduce(function (acc, n) {
      return acc + n;
    }, 0);
    return Math.round(suma / numeros.length);
  }

  function metricasGenerales(filtro) {
    const lista = evaluacionesFiltradas(filtro);
    const scores = lista.map(scoreDeEvaluacion);
    const criticos = lista.filter(function (ev) {
      return calcularScore(ev.criterios).tieneErrorCritico;
    });
    return {
      cantidadEvaluaciones: lista.length,
      scorePromedio: promedio(scores),
      cantidadErroresCriticos: criticos.length,
      porcentajeSinErrorCritico:
        lista.length === 0
          ? 100
          : Math.round(((lista.length - criticos.length) / lista.length) * 100),
    };
  }

  function metricasPorAsesor(filtro) {
    const lista = evaluacionesFiltradas(filtro);
    const porAsesor = {};

    lista.forEach(function (ev) {
      if (!porAsesor[ev.asesorId]) {
        porAsesor[ev.asesorId] = [];
      }
      porAsesor[ev.asesorId].push(ev);
    });

    return Object.keys(porAsesor)
      .map(function (asesorId) {
        const evaluaciones = porAsesor[asesorId];
        const ordenadas = evaluaciones.slice().sort(function (a, b) {
          return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
        });
        const scores = ordenadas.map(scoreDeEvaluacion);
        const mitad = Math.ceil(scores.length / 2);
        const primeraMitad = scores.slice(0, mitad);
        const segundaMitad = scores.slice(mitad);
        const tendencia =
          segundaMitad.length === 0
            ? 0
            : promedio(segundaMitad) - promedio(primeraMitad);

        const asesor = obtenerAsesorPorId(asesorId);
        const equipo = asesor ? obtenerEquipoPorId(asesor.equipoId) : null;

        return {
          asesorId: asesorId,
          nombre: asesor ? asesor.nombre : "Asesor desconocido",
          equipoNombre: equipo ? equipo.nombre : "-",
          cantidadEvaluaciones: evaluaciones.length,
          scorePromedio: promedio(scores),
          tendencia: tendencia,
          ultimaFecha: ordenadas.length
            ? ordenadas[ordenadas.length - 1].fecha
            : null,
        };
      })
      .sort(function (a, b) {
        return b.scorePromedio - a.scorePromedio;
      });
  }

  function metricasPorEquipo(filtro) {
    const lista = evaluacionesFiltradas(filtro);
    const porEquipo = {};

    lista.forEach(function (ev) {
      const asesor = obtenerAsesorPorId(ev.asesorId);
      const equipoId = asesor ? asesor.equipoId : "sin-equipo";
      if (!porEquipo[equipoId]) {
        porEquipo[equipoId] = [];
      }
      porEquipo[equipoId].push(ev);
    });

    return Object.keys(porEquipo).map(function (equipoId) {
      const evaluaciones = porEquipo[equipoId];
      const equipo = obtenerEquipoPorId(equipoId);
      return {
        equipoId: equipoId,
        nombre: equipo ? equipo.nombre : "Sin equipo",
        cantidadEvaluaciones: evaluaciones.length,
        scorePromedio: promedio(evaluaciones.map(scoreDeEvaluacion)),
      };
    });
  }

  // Serie temporal agrupada por semana (lunes de esa semana) para el
  // gráfico de evolución del panel.
  function serieTemporal(filtro) {
    const lista = evaluacionesFiltradas(filtro);
    const ordenada = lista.slice().sort(function (a, b) {
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
    });

    const porSemana = {};
    const ordenSemanas = [];

    ordenada.forEach(function (ev) {
      const clave = inicioDeSemana(ev.fecha);
      if (!porSemana[clave]) {
        porSemana[clave] = [];
        ordenSemanas.push(clave);
      }
      porSemana[clave].push(scoreDeEvaluacion(ev));
    });

    return ordenSemanas.map(function (clave) {
      return { semana: clave, scorePromedio: promedio(porSemana[clave]) };
    });
  }

  function inicioDeSemana(fechaIso) {
    const partes = fechaIso.split("-");
    const fecha = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );
    const diaSemana = fecha.getDay();
    const offset = diaSemana === 0 ? 6 : diaSemana - 1;
    fecha.setDate(fecha.getDate() - offset);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return anio + "-" + mes + "-" + dia;
  }

  function formatearFecha(fechaIso) {
    const partes = fechaIso.split("-");
    const fecha = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(fecha);
  }

  return {
    inicializar: inicializar,
    restablecer: restablecer,
    obtenerEstado: obtenerEstado,
    obtenerCriterios: obtenerCriterios,
    obtenerEquipos: obtenerEquipos,
    obtenerAsesores: obtenerAsesores,
    obtenerAsesorPorId: obtenerAsesorPorId,
    obtenerEquipoPorId: obtenerEquipoPorId,
    obtenerEvaluaciones: obtenerEvaluaciones,
    obtenerEvaluacionPorId: obtenerEvaluacionPorId,
    calcularScore: calcularScore,
    clasificarScore: clasificarScore,
    agregarEvaluacion: agregarEvaluacion,
    evaluacionesFiltradas: evaluacionesFiltradas,
    scoreDeEvaluacion: scoreDeEvaluacion,
    metricasGenerales: metricasGenerales,
    metricasPorAsesor: metricasPorAsesor,
    metricasPorEquipo: metricasPorEquipo,
    serieTemporal: serieTemporal,
    formatearFecha: formatearFecha,
  };
})();
