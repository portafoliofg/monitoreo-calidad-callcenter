// Capa de persistencia sobre localStorage.
// Guarda todo el estado de la app bajo una única clave, versionada por si
// en el futuro cambia la forma de los datos.

const Storage = (function () {
  const CLAVE = "mcc:datos:v1";

  function guardar(datos) {
    const texto = JSON.stringify(datos);
    window.localStorage.setItem(CLAVE, texto);
  }

  function leer() {
    const texto = window.localStorage.getItem(CLAVE);
    if (!texto) {
      return null;
    }
    try {
      return JSON.parse(texto);
    } catch (error) {
      console.warn("No se pudo leer el estado guardado, se descarta.", error);
      return null;
    }
  }

  function limpiar() {
    window.localStorage.removeItem(CLAVE);
  }

  return { guardar, leer, limpiar };
})();
