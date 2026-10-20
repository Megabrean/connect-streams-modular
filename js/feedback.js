import { elements } from "./dom.js";

export function showMessage(text, type = "info") {
    elements.message.textContent = text;
    elements.message.className = `message message-${type}`;
}

export function clearMessage() {
    elements.message.textContent = "";
    elements.message.className = "message";
}

export function showActionError(message, error) {
    const errorText =
        error?.message
        || error?.type
        || String(error || "erro desconhecido");

    showMessage(`${message}: ${errorText}`, "error");
    writeLog(`${message}: ${errorText}`);
    console.error(message, error);
}

export function writeLog(message) {
    const timestamp = new Date().toLocaleTimeString("pt-BR");

    if (elements.eventLog.textContent.trim() === "Aguardando eventos...") {
        elements.eventLog.textContent = "";
    }

    const line = document.createElement("div");
    line.textContent = `[${timestamp}] ${message}`;

    elements.eventLog.appendChild(line);
    elements.eventLog.scrollTop = elements.eventLog.scrollHeight;

    console.log(message);
}
