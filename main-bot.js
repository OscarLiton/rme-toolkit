/* ==========================================================================
   RME TOOLKIT - WELDING EXPERT ENGINE (CONEXIÓN DIRECTA GEMINI)
   ========================================================================== */

// Retirar el velo negro al cargar
document.addEventListener("DOMContentLoaded", () => {
    const transition = document.getElementById("transition");
    if (transition) setTimeout(() => transition.classList.add("fade-out"), 50);
});

// --- CONFIGURACIÓN DE GEMINI API ---
// Pega aquí la clave que generaste en Google AI Studio:
const API_KEY = "AQ.Ab8RN6KXxdA2iv-1bXUcnb04a7ocfAxGBUYn9vPMYMdgcGDQyQ"; 

const systemInstruction = `Eres Técnico Experto de Mantenimiento de Amazon RME en RMU1. Eres el especialista absoluto de este centro logístico en protocolos de soldadura, cortadoras y bandas. 
Responde a los técnicos de forma profesional, clara, directa y muy bien estructurada usando listas.

REGLAS OPERATIVAS INNEGOCIABLES DE RMU1 (¡APLICAR SIEMPRE DE FORMA ESTRICTA!):
1. Pinch Points: ANTES de pasar cualquier banda se DEBEN QUITAR los pinch points de la estructura. ANTES de darle marcha nuevamente a la máquina, se DEBEN VOLVER A COLOCAR.
2. Prensa 1325: La prensa es la 1325 no la 1225. Es OBLIGATORIO colocar las barras de presión y apretarlas con sargentos para evitar que los fingers se separen durante la soldadura.
3. Medida de Troquel/Pérdida: Ajusta todas las medidas a (252mm que es lo que realmente se pierde). NO SE AÑADEN 750 mm bajo ningún concepto.
4. Efecto Memoria: Al enfriar la banda vulcanizada, debe estar 100% RECTA, de lo contrario guardará la deformación térmica.

BASE DE CONOCIMIENTO TÉCNICO (CURSO BANDAS RMU1):

A) BANDAS CONVENCIONALES (PVC, PU, Antracita, Transparentes)
- Protocolo LOTO eléctrico obligatorio. Puesta a cero de rodillos.
- Cortadora 900: Escuadrar a 3 veces el ancho de banda. Aplicar siempre el "Corte Invertido".
- Elongación de trabajo: 1003 mm = 0.3% (Baja) | 1010 mm = 1% (Alta).

B) BANDAS SDI
- Regla de 4/4: Siempre se cambian las 4 bandas juntas.
- Tensión: Se ajustan por frecuencia (Hz), rango óptimo de 25 a 30 Hz. 
- SDI AMMERAAL: Material elástico. LLEVA APORTES. Obligatorio usar MOLDE DE ACERO.
- SDI FORBO: Material rígido. PROHIBIDO sobretensar. Es obligatorio destensar el módulo completo. NO LLEVA APORTES.
- Alineación: Se corrige solo interviniendo en las ruedas de los extremos.

C) BANDAS ARP / LR
- Sistema Neumático. Requiere LOTO eléctrico y Neumático (PURGAR todo el circuito).
- Truco de desmontaje: Cortar la banda vieja ANTES de destensar.

D) CORTADORA SERIE 900
- Usar Lubricante de Silicón Flexco en la hoja. Girar la manivela en el sentido de las agujas del reloj.

E) PRENSA NOVITOOL AERO
- Precalentamiento: Obligatorio para bandas de grosor superior a 4 mm.
- Tiempo de Permanencia: 30 segundos por cada 1 mm de espesor total.
- Apertura: Pulsar siempre el botón AZUL para aliviar presión neumática.

F) NDX PUN M
- Máximo 11 mm de grosor. JAMÁS volver la manivela hacia atrás sin haber sacado la banda. Troquelar siempre con el nylon hacia afuera.

G) PUN M SERIE
- Para "dedo sobre dedo", desplazar la bandeja a 35 mm. Troquelar primero los extremos para fijar la banda.`;

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatBox = document.getElementById('chatBox');
const sendBtn = document.getElementById('sendBtn');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = userInput.value.trim();
    if (!texto) return;

    añadirMensaje('user', texto);
    userInput.value = '';
    
    userInput.disabled = true;
    sendBtn.disabled = true;

    const loadingId = añadirCargando();

    try {
        if (API_KEY === "TU_CLAVE_API_AQUI" || API_KEY === "") {
            throw new Error('Clave API no configurada');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction + "\n\nPregunta del técnico: " + texto }]
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Error al contactar con Gemini.');

        const data = await response.json();
        const botReply = data.candidates[0].content.parts[0].text;
        
        quitarCargando(loadingId);
        añadirMensaje('bot', formatearRespuesta(botReply));

    } catch (error) {
        quitarCargando(loadingId);
        añadirMensaje('bot', 'Error de conexión. Asegúrate de haber pegado tu API Key en la línea 11 del archivo main-bot.js.');
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
});

function añadirMensaje(sender, texto) {
    const isBot = sender === 'bot';
    const avatar = isBot ? 'AI' : 'OL';
    const html = `
        <div class="msg-${sender}">
            <div class="msg-avatar">${avatar}</div>
            <div class="msg-bubble">${texto}</div>
        </div>
    `;
    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function añadirCargando() {
    const id = 'loading-' + Date.now();
    const html = `
        <div class="msg-bot" id="${id}">
            <div class="msg-avatar">AI</div>
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    chatBox.insertAdjacentHTML('beforeend', html);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function quitarCargando(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatearRespuesta(texto) {
    let formated = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formated = formated.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formated = formated.replace(/\n/g, '<br>');
    return formated;
}