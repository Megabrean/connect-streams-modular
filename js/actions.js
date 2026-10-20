import { appState } from "./state.js";
import { elements } from "./dom.js";
import { showMessage, showActionError, writeLog } from "./feedback.js";
import { getAgentConnection, getCallControlConnection, getHeldConnection, getContactConnectionsSnapshot } from "./connect-helpers.js";
import { updateContactPanel } from "./contact.js";
import { DEBUG } from "./config.js";

export function acceptContact() {
    const contact = appState.currentContact;

    if (!contact) {
        showMessage("Não existe uma chamada para atender.", "error");
        return;
    }

    setCallButtonsTemporarilyDisabled(true);

    contact.accept({
        success: () => {
            showMessage("Solicitação para atender enviada.", "success");
            writeLog("Ação executada: atender.");
            updateContactPanel();
        },
        failure: (error) => {
            showActionError("Não foi possível atender", error);
            updateContactPanel();
        }
    });
}

export function rejectContact() {
    const contact = appState.currentContact;

    if (!contact) {
        showMessage("Não existe uma chamada para rejeitar.", "error");
        return;
    }

    setCallButtonsTemporarilyDisabled(true);

    contact.reject({
        success: () => {
            showMessage("Chamada rejeitada.", "success");
            writeLog("Ação executada: rejeitar.");
            updateContactPanel();
        },
        failure: (error) => {
            showActionError("Não foi possível rejeitar", error);
            updateContactPanel();
        }
    });
}

export function toggleHold() {
    const contact =
        appState.currentContact;

    if (!contact) {
        showMessage(
            "Não existe um contato ativo.",
            "error"
        );

        return;
    }

    if (appState.holdActionPending) {
        showMessage(
            "Aguarde a conclusão da operação anterior.",
            "info"
        );

        writeLog(
            `Operação ainda pendente: `
            + `${appState.holdActionPending}`
        );

        return;
    }

    /*
     * Ao retomar, usamos a conexão que está
     * efetivamente marcada como hold.
     */
    const heldConnection =
        getHeldConnection(contact);

    if (heldConnection) {
        resumeContact(
            heldConnection
        );

        return;
    }

    /*
     * Ao colocar em espera, usamos preferencialmente
     * a conexão inicial do contato, e não apenas a
     * conexão do agente.
     */
    const callControlConnection =
        getCallControlConnection(contact);

    if (!callControlConnection) {
        showMessage(
            "A conexão da chamada não está disponível.",
            "error"
        );

        writeLog(
            "Hold: conexão de controle não encontrada."
        );

        return;
    }

    holdContact(
        callControlConnection
    );
}

function resumeContact(
    heldConnection
) {
    if (!heldConnection) {
        showMessage(
            "Nenhuma conexão em espera foi encontrada.",
            "error"
        );

        return;
    }

    appState.holdActionPending =
        "resuming";

    elements.btnHold.disabled =
        true;

    elements.btnHold.textContent =
        "Retomando...";

    writeLog(
        "Solicitando retomada "
        + "da conexão em espera..."
    );

    if (DEBUG) {
        console.log(
            "Conexões antes do resume:",
            getContactConnectionsSnapshot(
                appState.currentContact
            )
        );
    }

    let resumeTargetType = "-";
    let resumeTargetId = "-";
    let resumeTargetStatus = "-";

    try {
        if (
            typeof heldConnection.getType
            === "function"
        ) {
            resumeTargetType =
                heldConnection.getType()
                || "-";
        }

        if (
            typeof heldConnection.getConnectionId
            === "function"
        ) {
            resumeTargetId =
                heldConnection.getConnectionId()
                || "-";
        }

        if (
            typeof heldConnection.getStatus
            === "function"
        ) {
            const status =
                heldConnection.getStatus();

            resumeTargetStatus =
                status?.type
                || status?.name
                || "-";
        }
    } catch (error) {
        console.warn(
            "Não foi possível diagnosticar o alvo do resume.",
            error
        );
    }

    writeLog(
        `Resume alvo: `
        + `tipo=${resumeTargetType}, `
        + `id=${resumeTargetId}, `
        + `estado=${resumeTargetStatus}`
    );

    heldConnection.resume({
        success: () => {
            showMessage(
                "Solicitação para retomar enviada.",
                "success"
            );

            writeLog(
                "Ação de retomar enviada "
                + "para a conexão em hold."
            );

            /*
             * Não definimos currentHoldState como false
             * neste callback. A confirmação virá quando
             * nenhuma conexão permanecer em hold.
             */
            updateContactPanel();
        },

        failure: (error) => {
            const errorType =
                String(error?.type || "");

            if (
                errorType
                === "CallAlreadyResumedException"
            ) {
                appState.holdActionPending =
                    null;

                showMessage(
                    "A conexão já estava retomada.",
                    "info"
                );

                writeLog(
                    "O serviço informou que "
                    + "a conexão já estava retomada."
                );

                updateContactPanel();

                return;
            }

            appState.currentHoldState =
                true;

            appState.holdActionPending =
                null;

            elements.btnHold.textContent =
                "Retomar";

            showActionError(
                "Não foi possível retomar",
                error
            );

            updateContactPanel();
        }
    });
}

function holdContact(
    callControlConnection
) {
    appState.holdActionPending =
        "holding";

    elements.btnHold.disabled =
        true;

    elements.btnHold.textContent =
        "Colocando em espera...";

    writeLog(
        "Solicitando hold da chamada..."
    );

    if (DEBUG) {
        console.log(
            "Conexões antes do hold:",
            getContactConnectionsSnapshot(
                appState.currentContact
            )
        );
    }

    callControlConnection.hold({
        success: () => {
            showMessage(
                "Solicitação de hold enviada.",
                "success"
            );

            writeLog(
                "Ação executada: hold."
            );

            /*
             * Não encerramos a operação pendente aqui.
             * O refresh do contato confirmará o hold.
             */
            updateContactPanel();
        },

        failure: (error) => {
            appState.currentHoldState =
                false;

            appState.holdActionPending =
                null;

            elements.btnHold.textContent =
                "Hold";

            showActionError(
                "Não foi possível colocar em hold",
                error
            );

            updateContactPanel();
        }
    });
}

export function endContact() {
    const agentConnection = getAgentConnection();

    if (!agentConnection) {
        showMessage("A conexão do agente não está disponível.", "error");
        return;
    }

    setCallButtonsTemporarilyDisabled(true);

    agentConnection.destroy({
        success: () => {
            showMessage("Solicitação para encerrar enviada.", "success");
            writeLog("Ação executada: encerrar.");
            updateContactPanel();
        },
        failure: (error) => {
            showActionError("Não foi possível encerrar", error);
            updateContactPanel();
        }
    });
}

function setCallButtonsTemporarilyDisabled(disabled) {
    elements.btnAccept.disabled = disabled;
    elements.btnReject.disabled = disabled;
    elements.btnHold.disabled = disabled;
    elements.btnEnd.disabled = disabled;
}
