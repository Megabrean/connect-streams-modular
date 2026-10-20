import { appState } from "./state.js";

export function normalizeState(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

export function getContactStatusType(contact = appState.currentContact) {
    if (!contact) {
        return "";
    }

    try {
        const status = contact.getStatus();
        return normalizeState(status?.type || status?.name);
    } catch (error) {
        console.warn("Não foi possível ler o estado do contato.", error);
        return "";
    }
}

export function getConnectionStatusType(connection) {
    if (!connection) {
        return "";
    }

    try {
        const status = connection.getStatus();
        return normalizeState(status?.type || status?.name);
    } catch (error) {
        console.warn("Não foi possível ler o estado da conexão.", error);
        return "";
    }
}

export function isInboundContact(contact) {
    if (!contact) {
        return false;
    }

    /*
     * Primeira opção: método diretamente exposto
     * pelo objeto Contact, se disponível.
     */
    try {
        if (
            typeof contact.isInbound === "function"
        ) {
            return contact.isInbound();
        }
    } catch (error) {
        console.warn(
            "Não foi possível consultar contact.isInbound().",
            error
        );
    }

    /*
     * Segunda opção: método de iniciação do contato.
     */
    const initiationMethod =
        getContactInitiationMethod(contact);

    if (initiationMethod === "inbound") {
        return true;
    }

    /*
     * Fallback para versões que só exponham essa
     * informação na conexão inicial.
     */
    try {
        const initialConnection =
            contact.getInitialConnection();

        if (
            initialConnection
            && typeof initialConnection.isInbound
            === "function"
        ) {
            return initialConnection.isInbound();
        }
    } catch (error) {
        console.warn(
            "Não foi possível determinar a direção do contato.",
            error
        );
    }

    return false;
}

export function getContactDirection(contact) {
    const initiationMethod =
        getContactInitiationMethod(contact);

    if (initiationMethod === "inbound") {
        return "Entrada";
    }

    if (initiationMethod === "outbound") {
        return "Saída";
    }

    if (initiationMethod === "callback") {
        return "Callback";
    }

    if (initiationMethod === "transfer") {
        return "Transferência";
    }

    return isInboundContact(contact)
        ? "Entrada"
        : "Não identificada";
}

export function getAgentConnection(contact = appState.currentContact) {
    if (!contact) {
        return null;
    }

    try {
        return contact.getAgentConnection();
    } catch (error) {
        console.warn("Conexão do agente ainda não disponível.", error);
        return null;
    }
}

export function isConnectionOnHold(connection) {
    if (!connection) {
        return false;
    }

    try {
        if (
            typeof connection.isOnHold === "function"
            && connection.isOnHold()
        ) {
            return true;
        }
    } catch (error) {
        console.warn("Não foi possível consultar isOnHold().", error);
    }

    const statusType = getConnectionStatusType(connection);

    return ["hold", "on_hold", "held", "paused"].includes(statusType);
}

export function isConnectionConnected(connection) {
    if (!connection) {
        return false;
    }

    try {
        if (
            typeof connection.isConnected === "function"
            && connection.isConnected()
        ) {
            return true;
        }
    } catch (error) {
        console.warn("isConnected() não pôde ser consultado.", error);
    }

    return getConnectionStatusType(connection) === "connected";
}

export function getContactInitiationMethod(contact) {
    if (!contact) {
        return "";
    }

    try {
        if (
            typeof contact.getInitiationMethod
            === "function"
        ) {
            return normalizeState(
                contact.getInitiationMethod()
            );
        }
    } catch (error) {
        console.warn(
            "Não foi possível consultar o método de iniciação.",
            error
        );
    }

    return "";
}

export function getContactConnections(
    contact = appState.currentContact
) {
    if (!contact) {
        return [];
    }

    try {
        if (
            typeof contact.getConnections
            !== "function"
        ) {
            return [];
        }

        const connections =
            contact.getConnections();

        return Array.isArray(connections)
            ? connections.filter(Boolean)
            : [];

    } catch (error) {
        console.warn(
            "Não foi possível obter as conexões do contato.",
            error
        );

        return [];
    }
}

export function getInitialConnection(
    contact = appState.currentContact
) {
    if (!contact) {
        return null;
    }

    try {
        if (
            typeof contact.getInitialConnection
            !== "function"
        ) {
            return null;
        }

        return contact.getInitialConnection();

    } catch (error) {
        console.warn(
            "Não foi possível obter a conexão inicial.",
            error
        );

        return null;
    }
}

export function getHeldConnection(
    contact = appState.currentContact
) {
    if (!contact) {
        return null;
    }

    /*
     * Para chamadas inbound, a conexão inicial é a
     * conexão do cliente e deve ser a primeira opção
     * para a ação de retomar.
     */
    const initialConnection =
        getInitialConnection(contact);

    if (
        initialConnection
        && isConnectionOnHold(
            initialConnection
        )
    ) {
        return initialConnection;
    }

    const connections =
        getContactConnections(contact);

    /*
     * Segunda opção:
     * procura explicitamente uma conexão inbound
     * que esteja em hold.
     */
    const inboundHeldConnection =
        connections.find(
            (connection) => {
                let connectionType = "";

                try {
                    if (
                        typeof connection.getType
                        === "function"
                    ) {
                        connectionType =
                            normalizeState(
                                connection.getType()
                            );
                    }
                } catch (error) {
                    console.warn(
                        "Não foi possível ler o tipo da conexão.",
                        error
                    );
                }

                return (
                    connectionType === "inbound"
                    && isConnectionOnHold(
                        connection
                    )
                );
            }
        );

    if (inboundHeldConnection) {
        return inboundHeldConnection;
    }

    /*
     * Terceira opção:
     * qualquer conexão não-agent em hold.
     */
    const nonAgentHeldConnection =
        connections.find(
            (connection) => {
                let connectionType = "";

                try {
                    if (
                        typeof connection.getType
                        === "function"
                    ) {
                        connectionType =
                            normalizeState(
                                connection.getType()
                            );
                    }
                } catch (error) {
                    console.warn(
                        "Não foi possível ler o tipo da conexão.",
                        error
                    );
                }

                return (
                    connectionType !== "agent"
                    && isConnectionOnHold(
                        connection
                    )
                );
            }
        );

    if (nonAgentHeldConnection) {
        return nonAgentHeldConnection;
    }

    /*
     * Último fallback:
     * somente se nenhuma conexão do cliente em hold
     * tiver sido localizada.
     */
    return connections.find(
        (connection) =>
            isConnectionOnHold(connection)
    ) || null;
}

export function getCallControlConnection(
    contact = appState.currentContact
) {
    if (!contact) {
        return null;
    }

    /*
     * Para voz inbound, a conexão inicial é o alvo
     * preferencial das ações de hold e resume.
     */
    const initialConnection =
        getInitialConnection(contact);

    if (initialConnection) {
        return initialConnection;
    }

    /*
     * Fallback caso a versão do Streams não exponha
     * a conexão inicial naquele momento.
     */
    return getAgentConnection(contact);
}

export function getConnectionSnapshot(
    connection
) {
    if (!connection) {
        return {
            connectionId: "-",
            type: "-",
            status: "-",
            isAgent: false,
            isInbound: false,
            isConnected: false,
            isOnHold: false
        };
    }

    let connectionId = "-";
    let type = "-";
    let isAgent = false;
    let isInbound = false;

    try {
        if (
            typeof connection.getConnectionId
            === "function"
        ) {
            connectionId =
                connection.getConnectionId()
                || "-";
        }
    } catch (error) {
        console.warn(
            "Não foi possível obter o ID da conexão.",
            error
        );
    }

    try {
        if (
            typeof connection.getType
            === "function"
        ) {
            type =
                normalizeState(
                    connection.getType()
                ) || "-";
        }
    } catch (error) {
        console.warn(
            "Não foi possível obter o tipo da conexão.",
            error
        );
    }

    try {
        if (
            typeof connection.isAgent
            === "function"
        ) {
            isAgent =
                connection.isAgent();
        }
    } catch (error) {
        console.warn(
            "Não foi possível consultar isAgent().",
            error
        );
    }

    try {
        if (
            typeof connection.isInbound
            === "function"
        ) {
            isInbound =
                connection.isInbound();
        }
    } catch (error) {
        console.warn(
            "Não foi possível consultar isInbound().",
            error
        );
    }

    return {
        connectionId,
        type,

        status:
            getConnectionStatusType(
                connection
            ) || "-",

        isAgent,
        isInbound,

        isConnected:
            isConnectionConnected(
                connection
            ),

        isOnHold:
            isConnectionOnHold(
                connection
            )
    };
}

export function getContactConnectionsSnapshot(
    contact = appState.currentContact
) {
    if (!contact) {
        return [];
    }

    const connections =
        getContactConnections(contact);

    const snapshot =
        connections.map(
            (connection) =>
                getConnectionSnapshot(
                    connection
                )
        );

    /*
     * Algumas versões podem não incluir a conexão
     * inicial em getConnections(). Nesse caso,
     * acrescentamos explicitamente para diagnóstico.
     */
    const initialConnection =
        getInitialConnection(contact);

    if (
        initialConnection
        && !connections.includes(
            initialConnection
        )
    ) {
        snapshot.push({
            source: "initialConnection",

            ...getConnectionSnapshot(
                initialConnection
            )
        });
    }

    const agentConnection =
        getAgentConnection(contact);

    if (
        agentConnection
        && !connections.includes(
            agentConnection
        )
        && agentConnection
            !== initialConnection
    ) {
        snapshot.push({
            source: "agentConnection",

            ...getConnectionSnapshot(
                agentConnection
            )
        });
    }

    return snapshot;
}