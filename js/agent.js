import { appState } from "./state.js";
import { elements } from "./dom.js";

import {
    showMessage,
    showActionError,
    writeLog
} from "./feedback.js";

import {
    updateOutboundAvailability
} from "./outbound.js";

export function handleAgent(agent) {
    appState.currentAgent = agent;

    elements.agentName.textContent =
        agent.getName()
        || "Agente sem nome";

    writeLog(
        `Agente carregado: ${
            agent.getName()
            || "sem nome"
        }`
    );

    loadAgentStates(agent);
    updateAgentState(agent);
    updateOutboundAvailability();

    if (
        typeof agent.onStateChange
        === "function"
    ) {
        agent.onStateChange((event) => {
            writeLog(
                `Status: ${event.oldState} → ${event.newState}`
            );

            updateAgentState(agent);
            updateOutboundAvailability();
        });
    }

    if (
        typeof agent.onRefresh
        === "function"
    ) {
        agent.onRefresh(() => {
            updateAgentState(agent);
            updateOutboundAvailability();
        });
    }
}

function loadAgentStates(agent) {
    appState.availableAgentStates =
        agent.getAgentStates()
        || [];

    elements.agentStateSelect.innerHTML = "";

    if (
        appState.availableAgentStates.length
        === 0
    ) {
        const option =
            document.createElement("option");

        option.textContent =
            "Nenhum status disponível";

        option.value = "";

        elements.agentStateSelect.appendChild(
            option
        );

        elements.agentStateSelect.disabled =
            true;

        writeLog(
            "Nenhum status de agente foi retornado."
        );

        return;
    }

    appState.availableAgentStates.forEach(
        (agentState) => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                agentState.agentStateARN;

            option.textContent =
                agentState.name;

            elements.agentStateSelect.appendChild(
                option
            );
        }
    );

    elements.agentStateSelect.disabled = false;

    updateAgentState(agent);
}

export function updateAgentState(
    agent = appState.currentAgent
) {
    if (!agent) {
        return;
    }

    const state = agent.getState();

    if (!state) {
        return;
    }

    elements.agentStatus.textContent =
        state.name
        || "Desconhecido";

    elements.agentStatus.className =
        "status-badge";

    const stateType =
        String(state.type || "")
            .toLowerCase();

    if (stateType === "routable") {
        elements.agentStatus.classList.add(
            "status-routable"
        );
    } else if (
        stateType === "offline"
        || stateType === "error"
    ) {
        elements.agentStatus.classList.add(
            "status-offline"
        );
    } else {
        elements.agentStatus.classList.add(
            "status-not-routable"
        );
    }

    if (state.agentStateARN) {
        elements.agentStateSelect.value =
            state.agentStateARN;
    }
}

export function changeAgentState(event) {
    const agent = appState.currentAgent;

    if (!agent) {
        showMessage(
            "O agente ainda não foi inicializado.",
            "error"
        );

        return;
    }

    const selectedArn =
        event.target.value;

    const newState =
        appState.availableAgentStates.find(
            (state) =>
                state.agentStateARN
                === selectedArn
        );

    if (!newState) {
        showMessage(
            "O status selecionado não foi encontrado.",
            "error"
        );

        return;
    }

    elements.agentStateSelect.disabled = true;

    agent.setState(
        newState,
        {
            success: () => {
                elements.agentStateSelect.disabled =
                    false;

                showMessage(
                    `Status alterado para ${newState.name}.`,
                    "success"
                );

                writeLog(
                    `Solicitada alteração para: ${newState.name}`
                );

                updateAgentState(agent);
                updateOutboundAvailability();
            },

            failure: (error) => {
                elements.agentStateSelect.disabled =
                    false;

                showActionError(
                    "Não foi possível alterar o status",
                    error
                );

                updateAgentState(agent);
                updateOutboundAvailability();
            }
        }
    );
}