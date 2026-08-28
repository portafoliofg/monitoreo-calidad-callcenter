// Bootstrap de la app: carga los datos, inicializa cada vista y maneja
// la navegación por pestañas y el botón de restablecer.

(function () {
  const tabs = document.querySelectorAll(".app-nav__tab");
  const vistas = {
    panel: document.getElementById("vista-panel"),
    evaluacion: document.getElementById("vista-evaluacion"),
    historial: document.getElementById("vista-historial"),
  };

  function mostrarVista(nombre) {
    Object.keys(vistas).forEach(function (clave) {
      vistas[clave].classList.toggle("is-active", clave === nombre);
    });
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.dataset.vista === nombre);
    });
  }

  function iniciarNavegacion() {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        mostrarVista(tab.dataset.vista);
      });
    });
  }

  function iniciarBotonRestablecer() {
    const boton = document.getElementById("btn-restablecer");
    boton.addEventListener("click", async function () {
      const confirma = window.confirm(
        "Esto va a borrar los cambios locales y volver a cargar los datos de ejemplo originales. ¿Continuar?"
      );
      if (!confirma) {
        return;
      }
      await Datos.restablecer();
      Panel.actualizarSelectores();
      Panel.render();
      Historial.actualizarSelectores();
      Historial.render();
      Toast.mostrar("Datos de ejemplo restablecidos.");
    });
  }

  async function iniciar() {
    // La navegación y el botón de restablecer no dependen de los datos:
    // se activan primero para que la app responda aunque falle algo más
    // abajo (por ejemplo, si la librería de gráficos no llegó a cargar).
    iniciarNavegacion();
    iniciarBotonRestablecer();
    Toast.iniciar();
    Feedback.iniciar();

    await Datos.inicializar();

    [VistaEvaluacion, Panel, Historial].forEach(function (vista) {
      try {
        vista.iniciar();
      } catch (error) {
        console.error("No se pudo inicializar una vista:", error);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
