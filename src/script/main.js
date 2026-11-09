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
    const botonCancelarBorrado = document.getElementById("cancelarBorrado");
    const botonBorrarNota = document.getElementById("borrarNota");

    let arrastre = null;
    let ultimoToque = null;
    let notaEditando = null;
    let borradoPendiente = null;

    // 2. Eventos
    botonAdd.addEventListener("click", insertarNota);
    tablero.addEventListener("pointerdown", empezarArrastre);
    tablero.addEventListener("pointermove", moverNota);
    tablero.addEventListener("pointerup", soltarNota);
    /*
        el pointercancel se dispara cuando el navegador ve que la accion se ha interrumpido 
        o bien por poner la nota fuera del tablero o por un cambio de pestaña,
        pop up o lo que sea
    */
    tablero.addEventListener("pointercancel", cancelarArrastre);
    document.addEventListener("pointerdown", guardarAlPulsarFuera);
    botonCancelarBorrado.addEventListener("click", resolverBorrado);
    botonBorrarNota.addEventListener("click", resolverBorrado);

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
            //el toISOString convierte el objeto date a cadena de texto
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
        /*
            Se usa para distinguir si hay varias notas
            cual se ha pulsado, subiendo asi entre clase
            y clase hasta llegar al padre
        */
        const nota = e.target.closest(".nota");

        const hayNota = nota !== null;
        const esPunteroPrincipal = e.isPrimary;
        const esBotonPrincipal = e.button === 0;
        const hayArrastre = arrastre !== null;
        const hayBorradoPendiente = borradoPendiente !== null;
        const estoyEditandoEstaNota = nota === notaEditando;

        if (
            hayNota && esPunteroPrincipal && esBotonPrincipal &&
            !hayArrastre && !hayBorradoPendiente && !estoyEditandoEstaNota
        ) {
            let campo = ".texto";

            if (e.target.closest(".titulo")) {
                campo = ".titulo";
            }

            arrastre = {
                nota: nota,
                puntero: e.pointerId,
                inicioX: e.clientX,
                inicioY: e.clientY,
                origenX: nota.offsetLeft,
                origenY: nota.offsetTop,
                //performance.now devuelve el valor en milisegundos desde que se le pulsa encima
                tiempo: performance.now(),
                campo: campo
            };

            //Por si se sale del tablero la nota, que siga detectando los eventos
            tablero.setPointerCapture(e.pointerId);
        }
    }

    // Mueve el post-it siguiendo al puntero mientras se arrastra.
    function moverNota(e) {
        if (arrastre !== null) {
            //e.pointerId es el ID que trae el evento cada vez que se mueve un puntero
            if (arrastre.puntero === e.pointerId) {
                const desplazamientoX = e.clientX - arrastre.inicioX;
                const desplazamientoY = e.clientY - arrastre.inicioY;

                const nuevaX = arrastre.origenX + desplazamientoX;
                const nuevaY = arrastre.origenY + desplazamientoY;

                colocarNota(arrastre.nota, nuevaX, nuevaY);
            }
        }
    }

    // Al soltar, distingue un doble toque, un arrastre normal y un deslizamiento rápido para borrar.
    async function soltarNota(e) {
        if (arrastre !== null && arrastre.puntero === e.pointerId) {
            const movimiento = arrastre;
            const nota = movimiento.nota;
            arrastre = null;

            const desplazamientoX = e.clientX - movimiento.inicioX;
            const desplazamientoY = e.clientY - movimiento.inicioY;
            //Math.abs es el valor absoluto ya que la restar las posiciones pueden dar valores negativos en los ejes
            const distanciaHorizontal = Math.abs(desplazamientoX);
            const distanciaVertical = Math.abs(desplazamientoY);
            const ahora = performance.now();

            //Comprueva si se han movido en horizontal y vertical mas de 8 px
            const esToque = distanciaHorizontal < 8 && distanciaVertical < 8;

            if (esToque) {
                colocarNota(nota, movimiento.origenX, movimiento.origenY);

                let esDobleToque = false;

                if (ultimoToque !== null) {
                    //Compara que es la misma nota la que se esta clicando
                    const esLaMismaNota = ultimoToque.nota === nota;
                    //calcula el tiempo entre toques
                    const tiempoEntreToques = ahora - ultimoToque.tiempo;

                    esDobleToque = esLaMismaNota && (tiempoEntreToques < 350);
                }

                if (esDobleToque) {
                    //recuerda qué post-it estás editando. Se usa para evitar que lo arrastres mientras escribes y para guardar sus cambios cuando pulsas fuera
                    notaEditando = nota;
                    nota.querySelector(".titulo").contentEditable = true;
                    nota.querySelector(".texto").contentEditable = true;
                    //hace que el teclado escriba en la parte del post-it que se pulsa
                    nota.querySelector(movimiento.campo).focus();
                    ultimoToque = null;
                } else {
                    ultimoToque = {
                        //definido al principio de la funcion con movimiento.nota
                        nota: nota,
                        //definida arriba el performance.now
                        tiempo: ahora
                    };
                }
            } else {
                ultimoToque = null;

                const nuevaX = movimiento.origenX + desplazamientoX;
                const nuevaY = movimiento.origenY + desplazamientoY;

                colocarNota(nota, nuevaX, nuevaY);

                //cuántos milisegundos pasaron desde que pulsaste la nota hasta que la soltaste
                const duracion = Math.max(1, ahora - movimiento.tiempo);
                const velocidad = distanciaHorizontal / duracion;

                const recorreDistanciaSuficiente = distanciaHorizontal >= 100;
                const esHorizontal = distanciaHorizontal > 2 * distanciaVertical;
                const esRapido = velocidad >= 0.7;

                //si el movimiento de la nota debe abrir la confirmación de borrado
                if (recorreDistanciaSuficiente && esHorizontal && esRapido) {
                    //Guardala nota pendiente de borrar y donde estaba hubicada por si se cancela
                    borradoPendiente = movimiento;
                    // Muestra el panel de confirmación y pone el foco en Cancelar.
                    dialogo.hidden = false;
                    botonCancelarBorrado.focus();
                } else {
                    await updateDoc(doc(coleccion, nota.id), {
                        coordenadaX: nuevaX,
                        coordenadaY: nuevaY
                    });
                }
            }
        }
    }

    // Devuelve la nota a su posición inicial si el navegador cancela el gesto.
    function cancelarArrastre(e) {
        if (arrastre !== null) {
            /*
                Sirve para diferenciar, si hay dos dedos tocando la pantalla, que el que esta 
                haciendo una accion sobre la nota sea el que pueda hacer todo 
                haciendo asi que si un dedo esta ejecutando uan accion o esta
                en contacto con la nota el otro no puede mover ni hacer ninguna accion sobre esta
            */
            if (arrastre.puntero === e.pointerId) {
                volverAlOrigen(arrastre);
                arrastre = null;
                ultimoToque = null;
            }
        }
    }

    // Cierra la edición y guarda el título y el texto al pulsar fuera de la nota.
    async function guardarAlPulsarFuera(e) {
        //si la nota se esta editando o pulsas fuera
        if (notaEditando && !notaEditando.contains(e.target)) {
            const nota = notaEditando;
            const titulo = nota.querySelector(".titulo");
            const texto = nota.querySelector(".texto");

            const datos = {
                //innerText lee lo que tiene cada campo
                titulo: titulo.innerText,
                texto: texto.innerText
            };

            notaEditando = null;
            titulo.contentEditable = false;
            texto.contentEditable = false;

            await updateDoc(doc(coleccion, nota.id), datos);
        }
    }

    // Borra la nota si se confirma el diálogo o la devuelve a su sitio si se cancela.
    async function resolverBorrado(e) {
        if (borradoPendiente) {
            const movimiento = borradoPendiente;
            //coje la nota que esta pendiente de borrado, y luego vuelve a poner en null la variable
            const nota = movimiento.nota;
            borradoPendiente = null;
            dialogo.hidden = true;

            //comprueba si se ha pulsado el botón Borrar
            if (e.currentTarget.value === "borrar") {
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
