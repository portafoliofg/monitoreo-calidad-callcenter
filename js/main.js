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
    Toast.iniciar();
    Feedback.iniciar();
    await Datos.inicializar();

    VistaEvaluacion.iniciar();
    Panel.iniciar();
    Historial.iniciar();

    iniciarNavegacion();
    iniciarBotonRestablecer();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
