"use strict";

const datos = window.DATOS_RESERVAS;
const principal = "canceladas_o_ausentes";
const sinPresentacion = "solo_no_presentadas";
const medidas = {
  [principal]: "Cancelación o no presentación",
  solo_canceladas: "Solo cancelaciones",
  [sinPresentacion]: "Solo no presentaciones"
};
const origenes = {
  portugal: "Origen Portugal",
  resto: "Resto de orígenes conocidos"
};
const entero = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const decimal = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const centesimal = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function porcentaje(grupo, medida) {
  return 100 * grupo[medida] / grupo.reservas;
}

function brecha(grupos) {
  return porcentaje(grupos.portugal, principal) - porcentaje(grupos.resto, principal);
}

function rotulo(valor, medida) {
  const formato = medida === sinPresentacion ? centesimal : decimal;
  return `${formato.format(valor)} %`;
}

function compararTasas(a, b, medida) {
  return a[medida] * b.reservas - b[medida] * a.reservas;
}

function crearGrafico(id) {
  const destino = document.querySelector(`[data-grafico="${id}"]`);
  const fragmento = document.querySelector("#plantilla-grafico").content.cloneNode(true);
  const barras = fragmento.querySelector(".barras");
  const plantilla = document.querySelector("#plantilla-barra");
  const filas = {};

  for (const [origen, etiqueta] of Object.entries(origenes)) {
    const fila = plantilla.content.firstElementChild.cloneNode(true);
    fila.dataset.origen = origen;
    fila.querySelector(".barra-grupo").textContent = etiqueta;
    filas[origen] = {
      valor: fila.querySelector(".barra-valor"),
      relleno: fila.querySelector(".barra-relleno"),
      base: fila.querySelector(".barra-base")
    };
    barras.append(fila);
  }

  destino.append(fragmento);
  return { filas, nota: document.querySelector(`[data-diferencia="${id}"]`) };
}

function mostrar(grafico, grupos) {
  for (const [origen, fila] of Object.entries(grafico.filas)) {
    const grupo = grupos[origen];
    const tasa = porcentaje(grupo, principal);
    fila.valor.textContent = rotulo(tasa);
    fila.relleno.style.inlineSize = `${tasa}%`;
    fila.base.textContent = `${entero.format(grupo[principal])} de ${entero.format(grupo.reservas)} reservas`;
  }

  grafico.nota.textContent = `${decimal.format(brecha(grupos))} puntos porcentuales de diferencia`;
  grafico.nota.hidden = false;
}

function mostrarPosiciones(portugal, otros) {
  const destino = document.querySelector("#posicion-portugal");
  const plantilla = document.querySelector("#plantilla-posicion");
  document.querySelector("#posicion-universo").textContent =
    `Cada percentil indica qué porcentaje de los otros ${entero.format(otros.length)} orígenes tiene una tasa inferior a la de Portugal. Cada origen cuenta una vez.`;

  for (const [medida, etiqueta] of Object.entries(medidas)) {
    const orden = otros.map(pais => compararTasas(pais, portugal, medida));
    const inferiores = orden.filter(diferencia => diferencia < 0).length;
    const superiores = orden.filter(diferencia => diferencia > 0).length;
    const empates = otros.length - inferiores - superiores;
    const posicion = 100 * inferiores / otros.length;
    const figura = plantilla.content.firstElementChild.cloneNode(true);
    figura.dataset.medida = medida;
    figura.style.setProperty("--rango-portugal", `${posicion}%`);
    figura.querySelector("figcaption").textContent = medida === principal ? "Total" : etiqueta;
    figura.querySelector("strong").textContent = rotulo(posicion);
    figura.querySelector(".posicion-tasa").textContent =
      `Tasa de Portugal · ${rotulo(porcentaje(portugal, medida), medida)}`;

    for (const [grupo, cantidad, texto] of [
      ["inferiores", inferiores, "por debajo"],
      ["empates", empates, "con la misma tasa"],
      ["superiores", superiores, "por encima"]
    ]) {
      figura.querySelector(`.posicion-${grupo}`).style.flexGrow = cantidad;
      const detalle = figura.querySelector(`.detalle-${grupo}`);
      detalle.textContent = `${entero.format(cantidad)} ${texto}`;
      if (grupo === "empates") detalle.hidden = cantidad === 0;
    }
    destino.append(figura);
  }
  destino.closest(".posicion-paises").hidden = false;
}

function mostrarTopPaises(paises, portugal, ordenar) {
  const principales = document.querySelector("#paises-principales");
  const grafico = document.querySelector(".grafico-paises");
  const selector = document.querySelector("#medida-paises");
  const eje = grafico.querySelector(".eje-paises");
  const mensaje = document.querySelector("#resultado-medida-paises");
  const top = paises.filter(pais => pais.reservas >= 1000).slice(0, 10);
  const seleccion = top.includes(portugal) ? top : [...top.slice(0, 9), portugal].sort(ordenar);

  if (!top.includes(portugal)) {
    document.querySelector("#titulo-tasas-paises").textContent = "Los 9 primeros y Portugal";
    document.querySelector("#alcance-tasas-paises").textContent =
      "Orígenes con 1.000 reservas o más y Portugal como referencia";
  }

  const filas = seleccion.map(pais => {
    const renglon = document.createElement("tr");
    const nombre = document.createElement("th");
    nombre.scope = "row";
    nombre.textContent = pais.nombre;
    renglon.dataset.codigo = pais.codigo;
    renglon.append(nombre);

    const celda = renglon.insertCell();
    const pista = document.createElement("div");
    const punto = document.createElement("span");
    celda.className = "pais-punto-celda";
    celda.setAttribute("aria-hidden", "true");
    pista.className = "pais-punto-pista";
    punto.className = "pais-punto";
    pista.append(punto);
    celda.append(pista);
    const tasa = renglon.insertCell();
    renglon.insertCell().textContent = entero.format(pais.reservas);
    principales.append(renglon);
    return { pais, punto, tasa };
  });

  function actualizar(anunciar) {
    const medida = selector.value;
    const tasas = seleccion.map(pais => porcentaje(pais, medida));
    const maximo = medida === sinPresentacion ? Math.max(2, Math.ceil(Math.max(...tasas))) : 100;
    const tasaPortugal = porcentaje(portugal, medida);

    eje.children[1].textContent = entero.format(maximo / 2);
    eje.children[2].textContent = `${entero.format(maximo)} %`;
    grafico.style.setProperty("--tasa-portugal", `${100 * tasaPortugal / maximo}%`);
    for (const [i, fila] of filas.entries()) {
      fila.punto.style.left = `${100 * tasas[i] / maximo}%`;
      fila.tasa.textContent = rotulo(tasas[i], medida);
    }
    if (anunciar) {
      mensaje.textContent = `${medidas[medida]}. Portugal, ${rotulo(tasaPortugal, medida)}. Escala hasta ${maximo} por ciento.`;
    }
  }

  actualizar(false);
  selector.addEventListener("change", () => actualizar(true));
}

function mostrarCasosPaises(portugal, otros) {
  const superiores = otros.filter(pais => compararTasas(pais, portugal, principal) > 0);
  const cercano = otros.reduce((mejor, pais) =>
    Math.abs(pais.tasa - portugal.tasa) < Math.abs(mejor.tasa - portugal.tasa) ? pais : mejor
  );
  const mayorVolumen = superiores.reduce((mayor, pais) =>
    pais.reservas > mayor.reservas ? pais : mayor
  );
  const casos = document.querySelector("#paises-casos");
  const plantilla = document.querySelector("#plantilla-pais-caso");
  for (const [pais, contexto] of [
    [cercano, "La tasa más cercana a Portugal"],
    [mayorVolumen, "El que más reservas tiene entre los que superan a Portugal"]
  ]) {
    const caso = plantilla.content.cloneNode(true);
    caso.querySelector(".pais-caso-contexto").textContent = contexto;
    caso.querySelector("h4").textContent = pais.nombre;
    caso.querySelector("strong").textContent = rotulo(pais.tasa);
    caso.querySelector(".pais-punto").style.left = `${pais.tasa}%`;
    caso.querySelector(".pais-caso-base").textContent =
      `${entero.format(pais[principal])} de ${entero.format(pais.reservas)} reservas`;
    casos.append(caso);
  }
  document.querySelector("#paises-superiores").textContent =
    `${superiores.length} orígenes superan la tasa de Portugal en la muestra. Cada uno tiene ${mayorVolumen.reservas} reservas o menos.`;
}

function mostrarPaises() {
  const nombres = new Intl.DisplayNames("es", { type: "region" });
  const ordenar = (a, b) =>
    compararTasas(b, a, principal) || b.reservas - a.reservas || a.codigo.localeCompare(b.codigo);
  const paises = datos.paises.map(pais => ({
    ...pais,
    nombre: nombres.of(pais.iso2) || pais.codigo,
    tasa: porcentaje(pais, principal)
  })).sort(ordenar);
  const portugal = paises.find(pais => pais.codigo === "PRT");
  const otros = paises.filter(pais => pais !== portugal);

  document.querySelector("#paises").style.setProperty("--tasa-portugal", `${portugal.tasa}%`);
  mostrarPosiciones(portugal, otros);
  mostrarTopPaises(paises, portugal, ordenar);
  mostrarCasosPaises(portugal, otros);
}

function mostrarHoteles() {
  const selector = document.querySelector("#selector-cartera");
  const lisboa = crearGrafico("urbano");
  const algarve = crearGrafico("vacacional");
  const resultado = document.querySelector("#resultado-cartera");
  const cobertura = document.querySelector("#cobertura-cartera");
  function actualizar() {
    const filtrado = selector.querySelector("input:checked").value === "sin_deposito";
    const grupos = filtrado ? datos.grupos_sin_deposito : datos.grupos;
    mostrar(lisboa, grupos.urbano);
    mostrar(algarve, grupos.vacacional);
    const puntosLisboa = brecha(grupos.urbano);
    const puntosAlgarve = brecha(grupos.vacacional);
    resultado.textContent = puntosLisboa > puntosAlgarve
      ? `Lisboa presenta la mayor brecha, con ${decimal.format(puntosLisboa)} puntos frente a ${decimal.format(puntosAlgarve)} en el Algarve.`
      : `El Algarve presenta la mayor brecha, con ${decimal.format(puntosAlgarve)} puntos frente a ${decimal.format(puntosLisboa)} en Lisboa.`;
    const n = grupos.total.portugal.reservas + grupos.total.resto.reservas;
    cobertura.textContent = filtrado
      ? `${entero.format(n)} reservas sin depósito registrado · ${rotulo(100 * n / datos.muestra.con_origen)} de las que tienen origen informado`
      : `${entero.format(n)} reservas con origen informado · Ambos hoteles`;
  }
  actualizar();
  selector.addEventListener("change", actualizar);
}

function iniciar() {
  for (const campo of document.querySelectorAll("[data-muestra]")) {
    campo.textContent = entero.format(datos.muestra[campo.dataset.muestra]);
  }
  mostrar(crearGrafico("total"), datos.grupos.total);
  mostrarPaises();
  mostrarHoteles();

  document.querySelector("#brecha-todas").textContent = `${decimal.format(brecha(datos.grupos.total))} puntos`;
  document.querySelector("#brecha-sin-deposito").textContent = decimal.format(brecha(datos.grupos_sin_deposito.total));
  for (const origen of Object.keys(origenes)) {
    document.querySelector(`#pago-${origen}`).textContent =
      rotulo(100 * datos.pago_integro[origen] / datos.grupos.total[origen].reservas);
  }
}

if (datos) {
  iniciar();
} else {
  document.querySelector("#aviso-datos").hidden = false;
  document.querySelector(".selector").disabled = true;
  document.querySelector("#medida-paises").disabled = true;
}
