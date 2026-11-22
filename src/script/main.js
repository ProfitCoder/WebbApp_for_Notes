    import { firebaseConfig } from "./firebase_config.js";
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc } 
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"

    // 1. Constantes y variables
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const coleccion = collection(db, "ColeccionPostIt");

    const tablero = document.getElementById("PostIt");
    const dialogo = document.getElementById("confirmarBorrado");
    const botonAdd = document.getElementById("Add");
    const botonCancelarBorrado = document.getElementById("cancelarBorrado");
    const botonBorrarNota = document.getElementById("borrarNota");
    const sesionIni = document.getElementById("sesionIni");
    const formLogin = document.getElementById("IniciarSesionC");

    let arrastre = null;
    let ultimoToque = null;
    let notaEditando = null;
    let borradoPendiente = null;

    var user = null;

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
    sesionIni.addEventListener("click",iniciaSesionGoogle);
    formLogin.addEventListener("click", iniciaSesionCorreo);

    // 3. Funciones
    function iniciaSesionCorreo()
    {
        signInWithEmailAndPassword(auth, "fernandez@gmail.com", "123456")
        .then((userCredential) => {
            // Signed in 
            user = userCredential.user;
            document.getElementById("panelLogin").hidden = true;
            cargarNotas();

        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
        });
    }

    function iniciaSesionGoogle()
    {
        signInWithPopup(auth, new GoogleAuthProvider())
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            user = result.user;
            // IdP data available using getAdditionalUserInfo(result)
            document.getElementById("panelLogin").hidden = true;
            cargarNotas();


        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            // ...
        });
    }

    // Variables para el movimiento de las notas

    let inicioX = 0;
    let inicioY = 0;
    let posicionX = 0;
    let posicionY = 0;
    let tiempoInicio = 0;
    let tiempoUltimoToque = 0;
    let puntero = null;
    let campoEditar = ".texto";


    // Cargar las notas de Firebase

    async function cargarNotas()
    {
        const resultado = await getDocs(collection(db, "ColeccionPostIt", "NOTAS_USUARIO_" + user.uid, "Notas"));

        tablero.innerHTML = "";

        for (const documento of resultado.docs)
        {
            mostrarNota(documento.id, documento.data());
        }
    }


    // Crear una nota nueva

    async function insertarNota()
    {
        if (user === null)
        {
            alert("Primero debes iniciar sesión");
            return;
        }

        const referencia = doc(collection(db, "ColeccionPostIt", "NOTAS_USUARIO_" + user.uid, "Notas"));

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


    // Mostrar una nota en la página

    function mostrarNota(id, datos)
    {

        //Comprueba si existe la nota
        if (document.getElementById(id) === null)
        {
            const nota = document.createElement("div");
            const titulo = document.createElement("p");
            const texto = document.createElement("p");

            nota.id = id;
            nota.className = "nota";

            titulo.className = "titulo";
            texto.className = "texto";

            titulo.textContent = datos.titulo;
            texto.textContent = datos.texto;

            nota.style.backgroundColor = datos.color;

            nota.style.left = datos.coordenadaX + "px";
            nota.style.top = datos.coordenadaY + "px";

            //Con el DOM creamos la nota
            nota.appendChild(titulo);
            nota.appendChild(texto);

            tablero.appendChild(nota);
        }
    }


    // Empezar a mover una nota

    function empezarArrastre(e)
    {
        const nota = e.target.closest(".nota");

        //Comprobaciones
        let notaNoExiste = (nota === null);
        //Para comprobar cual es el boton pulsado, (izq 0, rued 1 y dere 2)
        //Primary por si hay varios dedos en la pantalla (solo movil)
        let botonTocado = (e.button !== 0 || !e.isPrimary);
        let hayArrastre = (arrastre !== null);
        let notaEditandose = (notaEditando !== null);
        let notaPendienteBorrado = (borradoPendiente !== null);

        if (notaNoExiste || botonTocado || hayArrastre || notaEditandose) 
        {
            return;
        }

        // Guardamos la nota que estamos moviendo

        arrastre = nota;

        puntero = e.pointerId;

        // Posición donde hemos pulsado

        inicioX = e.clientX;
        inicioY = e.clientY;

        // Posición inicial de la nota

        posicionX = nota.offsetLeft;
        posicionY = nota.offsetTop;

        // Momento en el que pulsamos

        tiempoInicio = Date.now();

        // Comprobar si pulsamos sobre el título

        campoEditar = ".texto";

        if (e.target.closest(".titulo"))
        {
            campoEditar = ".titulo";
        }

        /*
            Esto se hace para que el tablero siga detectando el movimiento del ratón o del dedo, 
            aunque el puntero se salga de sus límites mientras arrastras una nota 
        */
            tablero.setPointerCapture(e.pointerId);
    }


    // Mover la nota

    function moverNota(e)
    {

        let notaNoSeMueve = (arrastre === null);
        //comprueba que el puntero que está moviendo la nota sea el mismo que comenzó a arrastrarla
        let noMismoPuntero = (e.pointerId !== puntero); 

        if (notaNoSeMueve || noMismoPuntero) 
        {
            return;
        }

        // Calcular cuánto se ha movido el ratón

        const movimientoX = e.clientX - inicioX;
        const movimientoY = e.clientY - inicioY;

        // Calcular la nueva posición

        const nuevaX = posicionX + movimientoX;
        const nuevaY = posicionY + movimientoY;

        // Mover la nota en pantalla

        arrastre.style.left = nuevaX + "px";
        arrastre.style.top = nuevaY + "px";
    }


    // Soltar la nota

    async function soltarNota(e)
    {

        let notaNoSeMueve = (arrastre === null);
        //comprueba que el puntero que está moviendo la nota sea el mismo que comenzó a arrastrarla
        let noMismoPuntero = (e.pointerId !== puntero);

        if (notaNoSeMueve || noMismoPuntero) 
        {
            return;
        }

        const nota = arrastre;

        arrastre = null;
        puntero = null;

        // Calcular el movimiento realizado

        const movimientoX = e.clientX - inicioX;
        const movimientoY = e.clientY - inicioY;

        const distanciaX = Math.abs(movimientoX);
        const distanciaY = Math.abs(movimientoY);

        const ahora = Date.now();

        // Comprobar si solamente hemos pulsado la nota

        if (distanciaX < 8 && distanciaY < 8)
        {
            nota.style.left = posicionX + "px";
            nota.style.top = posicionY + "px";

            // Comprobar si hemos pulsado dos veces

            let ultimoToqueMismaNota = (ultimoToque === nota);
            let menosdeMili = (ahora - tiempoUltimoToque < 350);

            if (ultimoToqueMismaNota && menosdeMili)
            {
                notaEditando = nota;

                nota.querySelector(".titulo").contentEditable = true;
                nota.querySelector(".texto").contentEditable = true;

                nota.querySelector(campoEditar).focus();

                ultimoToque = null;
            }
            else
            {
                ultimoToque = nota;
                tiempoUltimoToque = ahora;
            }

            return;
        }

        ultimoToque = null;

        // Calcular dónde hemos soltado la nota

        const nuevaX = posicionX + movimientoX;
        const nuevaY = posicionY + movimientoY;

        nota.style.left = nuevaX + "px";
        nota.style.top = nuevaY + "px";

        // Comprobar si hemos deslizado rápidamente

        let tiempo = ahora - tiempoInicio;

        if (tiempo < 1)
        {
            tiempo = 1;
        }

        const velocidad = distanciaX / tiempo;

        if (distanciaX >= 100 && distanciaX > distanciaY * 2 && velocidad >= 0.7)
        {
            borradoPendiente = nota;

            dialogo.hidden = false;

            botonCancelarBorrado.focus();
        }
        else
        {
            // Guardar la nueva posición en Firebase

            await updateDoc(doc(db, "ColeccionPostIt", "NOTAS_USUARIO_" + user.uid, "Notas", nota.id), {
                coordenadaX: nuevaX,
                coordenadaY: nuevaY
            });
        }
    }


    // Cancelar el movimiento

    function cancelarArrastre(e)
    {

        let notaNoSeMueve = (arrastre === null);
        //comprueba que el puntero que está moviendo la nota sea el mismo que comenzó a arrastrarla
        let noMismoPuntero = (e.pointerId !== puntero);

        if (notaNoSeMueve || noMismoPuntero) {
            return;
        }

        // Devolver la nota a su posición anterior

        arrastre.style.left = posicionX + "px";
        arrastre.style.top = posicionY + "px";

        arrastre = null;
        puntero = null;
        ultimoToque = null;
    }


    // Guardar una nota al pulsar fuera

    async function guardarAlPulsarFuera(e)
    {

        let noSeEdita = (notaEditando === null);
        let contieneElCursor = (notaEditando.contains(e.target));

        if (noSeEdita || contieneElCursor) {
            return;
        }

        const nota = notaEditando;

        const titulo = nota.querySelector(".titulo");
        const texto = nota.querySelector(".texto");

        // Dejar de editar

        titulo.contentEditable = false;
        texto.contentEditable = false;

        notaEditando = null;

        // Guardar los cambios en Firebase

        await updateDoc(doc(db, "ColeccionPostIt", "NOTAS_USUARIO_" + user.uid, "Notas", nota.id), {
            titulo: titulo.innerText,
            texto: texto.innerText
        });
    }


    // Confirmar o cancelar el borrado

    async function resolverBorrado(e)
    {

        let noHayBorradoPendiente = (borradoPendiente === null);

        if (noHayBorradoPendiente) 
        {
            return;
        }

        const nota = borradoPendiente;

        // Si pulsamos el botón borrar

        let dondeSePulsaBorra = (e.currentTarget.value === "borrar");

        if (dondeSePulsaBorra)
        {
            await deleteDoc(doc(db, "ColeccionPostIt", "NOTAS_USUARIO_" + user.uid, "Notas", nota.id));

            nota.remove();
        }
        else
        {
            // Si cancelamos, devolver la nota a su sitio

            nota.style.left = posicionX + "px";
            nota.style.top = posicionY + "px";
        }

        borradoPendiente = null;

        dialogo.hidden = true;
    }