import { firebaseConfig } from "./firebase_config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Constantes y variables
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const coleccion = collection(db, "ColeccionPostIt");

const tablero = document.getElementById("PostIt");
const dialogo = document.getElementById("confirmarBorrado");
const botonAdd = document.getElementById("Add");

let arrastre = null;
let ultimoToque = null;
let notaEditando = null;
let borradoPendiente = null;

// 2. Eventos
botonAdd.addEventListener("click", insertarNota);
tablero.addEventListener("pointerdown", empezarArrastre);
tablero.addEventListener("pointermove", moverNota);
tablero.addEventListener("pointerup", soltarNota);
tablero.addEventListener("pointercancel", cancelarArrastre);
document.addEventListener("pointerdown", guardarAlPulsarFuera);
dialogo.addEventListener("close", resolverBorrado);

cargarNotas();

// 3. Funciones

// Lee las notas de Firestore y las muestra en el tablero.
async function cargarNotas() {
    const resultado = await getDocs(coleccion);

    for (const documento of resultado.docs) {
        mostrarNota(documento.id, documento.data());
    }
}

// Guarda una nota nueva en Firestore y la añade al tablero.
async function insertarNota() {
    const referencia = doc(coleccion);

    const datos = {
        id: referencia.id,
        titulo: "Nueva nota",
        texto: "Escribe aquí",
        color: "#FEF3C7",
        coordenadaX: 20,
        coordenadaY: 20,
        fechaCreacion: new Date().toISOString()
    };

    await setDoc(referencia, datos);
    mostrarNota(referencia.id, datos);
}

// Crea el post-it con su título, texto, color y posición si aún no está en el tablero.
function mostrarNota(id, datos) {
    if (!document.getElementById(id)) {
        const nota = document.createElement("div");
        const titulo = document.createElement("p");
        const texto = document.createElement("p");

        nota.id = id;
        nota.className = "nota";
        titulo.className = "titulo";
        texto.className = "texto";

        titulo.textContent = datos.titulo ?? "Nota";
        texto.textContent = datos.texto ?? "";
        nota.style.backgroundColor = datos.color || "#FEF3C7";

        colocarNota(
            nota,
            Number(datos.coordenadaX) || 0,
            Number(datos.coordenadaY) || 0
        );

        nota.append(titulo, texto);
        tablero.appendChild(nota);
    }
}

// Guarda la posición inicial de la nota y del puntero al pulsar sobre el post-it.
function empezarArrastre(e) {
    const nota = e.target.closest(".nota");

    if (
        nota && e.isPrimary && e.button === 0 &&
        !arrastre && !borradoPendiente && nota !== notaEditando
    ) {
        arrastre = {
            nota,
            puntero: e.pointerId,
            inicioX: e.clientX,
            inicioY: e.clientY,
            origenX: nota.offsetLeft,
            origenY: nota.offsetTop,
            tiempo: performance.now(),
            campo: e.target.closest(".titulo") ? ".titulo" : ".texto"
        };

        tablero.setPointerCapture(e.pointerId);
    }
}

// Mueve el post-it siguiendo al puntero mientras se arrastra.
function moverNota(e) {
    if (arrastre?.puntero === e.pointerId) {
        const x = arrastre.origenX + e.clientX - arrastre.inicioX;
        const y = arrastre.origenY + e.clientY - arrastre.inicioY;

        colocarNota(arrastre.nota, x, y);
    }
}

// Al soltar, distingue un doble toque, un arrastre normal y un deslizamiento rápido para borrar.
async function soltarNota(e) {
    if (arrastre?.puntero === e.pointerId) {
        const movimiento = arrastre;
        const nota = movimiento.nota;
        arrastre = null;

        const dx = e.clientX - movimiento.inicioX;
        const dy = e.clientY - movimiento.inicioY;
        const ahora = performance.now();
        const distancia = Math.abs(dx);
        const velocidad = distancia / Math.max(1, ahora - movimiento.tiempo);

        if (distancia < 8 && Math.abs(dy) < 8) {
            colocarNota(nota, movimiento.origenX, movimiento.origenY);

            if (ultimoToque?.nota === nota && ahora - ultimoToque.tiempo < 350) {
                notaEditando = nota;
                nota.querySelector(".titulo").contentEditable = "true";
                nota.querySelector(".texto").contentEditable = "true";
                nota.querySelector(movimiento.campo).focus();
                ultimoToque = null;
            } else {
                ultimoToque = { nota, tiempo: ahora };
            }
        } else {
            ultimoToque = null;

            const x = movimiento.origenX + dx;
            const y = movimiento.origenY + dy;

            colocarNota(nota, x, y);

            if (distancia >= 100 && distancia > 2 * Math.abs(dy) && velocidad >= 0.7) {
                borradoPendiente = movimiento;
                dialogo.returnValue = "cancelar";
                dialogo.showModal();
            } else {
                await updateDoc(doc(coleccion, nota.id), {
                    coordenadaX: x,
                    coordenadaY: y
                });
            }
        }
    }
}

// Devuelve la nota a su posición inicial si el navegador cancela el gesto.
function cancelarArrastre(e) {
    if (arrastre?.puntero === e.pointerId) {
        volverAlOrigen(arrastre);
        arrastre = null;
        ultimoToque = null;
    }
}

// Cierra la edición y guarda el título y el texto al pulsar fuera de la nota.
async function guardarAlPulsarFuera(e) {
    if (notaEditando && !notaEditando.contains(e.target)) {
        const nota = notaEditando;
        const titulo = nota.querySelector(".titulo");
        const texto = nota.querySelector(".texto");

        const datos = {
            titulo: titulo.innerText,
            texto: texto.innerText
        };

        notaEditando = null;
        titulo.contentEditable = "false";
        texto.contentEditable = "false";

        await updateDoc(doc(coleccion, nota.id), datos);
    }
}

// Borra la nota si se confirma el diálogo o la devuelve a su sitio si se cancela.
async function resolverBorrado() {
    if (borradoPendiente) {
        const movimiento = borradoPendiente;
        const nota = movimiento.nota;
        borradoPendiente = null;

        if (dialogo.returnValue === "borrar") {
            await deleteDoc(doc(coleccion, nota.id));
            nota.remove();
        } else {
            volverAlOrigen(movimiento);
        }
    }
}

// Coloca el post-it en las coordenadas X e Y en píxeles.
function colocarNota(nota, x, y) {
    nota.style.left = x + "px";
    nota.style.top = y + "px";
}

// Devuelve el post-it a su posición anterior al arrastre.
function volverAlOrigen(movimiento) {
    colocarNota(movimiento.nota, movimiento.origenX, movimiento.origenY);
}