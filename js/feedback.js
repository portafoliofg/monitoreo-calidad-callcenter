// Generador de feedback: arma el texto a partir de una evaluación y
// maneja el modal donde se muestra, con botón de copiar.

const Feedback = (function () {
  let overlay;
  let textoEl;
  let btnCopiar;
  let btnCerrar1;
  let btnCerrar2;

  function iniciar() {
    overlay = document.getElementById("modal-feedback");
    textoEl = document.getElementById("modal-texto");
    btnCopiar = document.getElementById("modal-copiar");
    btnCerrar1 = document.getElementById("modal-cerrar");
    btnCerrar2 = document.getElementById("modal-cerrar-2");

    btnCerrar1.addEventListener("click", cerrar);
    btnCerrar2.addEventListener("click", cerrar);
    overlay.addEventListener("click", function (evento) {
      if (evento.target === overlay) {
        cerrar();
      }
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && overlay.classList.contains("is-open")) {
        cerrar();
      }
    });
    btnCopiar.addEventListener("click", copiarTexto);
  }

  function primerNombre(nombreCompleto) {
    const partes = nombreCompleto.split(" ");
    return partes[0];
  }

  function construirTexto(evaluacion) {
    const asesor = Datos.obtenerAsesorPorId(evaluacion.asesorId);
    const criteriosDef = Datos.obtenerCriterios();
    const resultado = Datos.calcularScore(evaluacion.criterios);
    const clasificacion = Datos.clasificarScore(resultado.score);
    const fechaTexto = Datos.formatearFecha(evaluacion.fecha);

    const detalle = evaluacion.criterios.map(function (item) {
      const def = criteriosDef.find(function (c) {
        return c.id === item.criterioId;
      });
      return {
        nombre: def ? def.nombre : item.criterioId,
        puntaje: item.puntaje,
        errorCritico: item.errorCritico,
      };
    });

    const ordenDesc = detalle.slice().sort(function (a, b) {
      return b.puntaje - a.puntaje;
    });
    const ordenAsc = detalle.slice().sort(function (a, b) {
      return a.puntaje - b.puntaje;
    });

    const fortalezas = ordenDesc.slice(0, 2);
    const nombresFortalezas = fortalezas.map(function (f) {
      return f.nombre;
    });
    const oportunidades = ordenAsc
      .filter(function (item) {
        return nombresFortalezas.indexOf(item.nombre) === -1;
      })
      .slice(0, 2);

    const nombrePila = asesor ? primerNombre(asesor.nombre) : "equipo";

    const clasificacionTexto =
      clasificacion === "alto"
        ? "muy buen desempeño"
        : clasificacion === "medio"
        ? "desempeño dentro de lo esperado, con margen de mejora"
        : "desempeño por debajo del estándar esperado";

    const lineas = [];
    lineas.push("Hola " + nombrePila + ", te comparto el feedback de tu llamada del " + fechaTexto + ".");
    lineas.push("");
    lineas.push("Score final: " + resultado.score + "/100 (" + clasificacionTexto + ")");
    lineas.push("");

    if (resultado.tieneErrorCritico) {
      const criticos = detalle.filter(function (d) {
        return d.errorCritico;
      });
      const nombresCriticos = criticos
        .map(function (c) {
          return c.nombre;
        })
        .join(", ");
      lineas.push(
        "Ojo: la llamada tuvo un error crítico en " +
          nombresCriticos +
          ". Por política de calidad, esto lleva el score a 0 más allá del resto de los puntajes."
      );
      lineas.push("");
    }

    lineas.push("Fortalezas:");
    fortalezas.forEach(function (f) {
      lineas.push("- " + f.nombre + " (" + f.puntaje + "/100)");
    });
    lineas.push("");

    if (oportunidades.length > 0) {
      lineas.push("Oportunidades de mejora:");
      oportunidades.forEach(function (o) {
        lineas.push("- " + o.nombre + " (" + o.puntaje + "/100)");
      });
    } else {
      lineas.push("Sin oportunidades de mejora puntuales: los criterios estuvieron parejos en esta llamada.");
    }

    if (evaluacion.comentarioGeneral) {
      lineas.push("");
      lineas.push("Comentario del evaluador: " + evaluacion.comentarioGeneral);
    }

    lineas.push("");
    lineas.push("Seguimos afinando juntos. Cualquier duda, lo charlamos en la próxima 1:1.");

    return lineas.join("\n");
  }

  function abrir(evaluacion) {
    textoEl.textContent = construirTexto(evaluacion);
    overlay.classList.add("is-open");
  }

  function cerrar() {
    overlay.classList.remove("is-open");
  }

  function copiarTexto() {
    const texto = textoEl.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(texto)
        .then(function () {
          Toast.mostrar("Feedback copiado al portapapeles.");
        })
        .catch(function () {
          copiarConFallback(texto);
        });
    } else {
      copiarConFallback(texto);
    }
  }

  function copiarConFallback(texto) {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      document.execCommand("copy");
      Toast.mostrar("Feedback copiado al portapapeles.");
    } catch (error) {
      Toast.mostrar("No se pudo copiar automáticamente. Seleccioná el texto y copiá manualmente.");
    }
    document.body.removeChild(area);
  }

  return { iniciar: iniciar, abrir: abrir, construirTexto: construirTexto };
})();

// Utilidad mínima de notificaciones tipo toast, usada por Feedback y por
// las demás vistas.
const Toast = (function () {
  let el;
  let temporizador;

  function iniciar() {
    el = document.getElementById("toast");
  }

  function mostrar(mensaje) {
    if (!el) {
      return;
    }
    el.textContent = mensaje;
    el.classList.add("is-visible");
    if (temporizador) {
      clearTimeout(temporizador);
    }
    temporizador = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2600);
  }

  return { iniciar: iniciar, mostrar: mostrar };
})();
