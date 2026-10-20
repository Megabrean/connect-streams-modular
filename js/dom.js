export const elements = {};

export function cacheElements() {
    elements.ccpContainer =
        document.getElementById("container-div");

    elements.agentName =
        document.getElementById("agent-name");

    elements.agentStatus =
        document.getElementById("agent-status");

    elements.agentStateSelect =
        document.getElementById(
            "agent-state-select"
        );

    elements.btnOpenDialer =
        document.getElementById(
            "btn-open-dialer"
        );

    elements.outboundDialer =
        document.getElementById(
            "outbound-dialer"
        );

    elements.outboundNumber =
        document.getElementById(
            "outbound-number"
        );

    elements.btnCloseDialer =
        document.getElementById(
            "btn-close-dialer"
        );

    elements.btnBackspace =
        document.getElementById(
            "btn-dialer-backspace"
        );

    elements.btnStartOutbound =
        document.getElementById(
            "btn-start-outbound"
        );

    elements.dialPadButtons =
        Array.from(
            document.querySelectorAll(
                ".dial-pad-button"
            )
        );

    elements.contactId =
        document.getElementById("contact-id");

    elements.contactType =
        document.getElementById("contact-type");

    elements.contactState =
        document.getElementById("contact-state");

    elements.contactDirection =
        document.getElementById(
            "contact-direction"
        );

    elements.btnAccept =
        document.getElementById("btn-accept");

    elements.btnReject =
        document.getElementById("btn-reject");

    elements.btnHold =
        document.getElementById("btn-hold");

    elements.btnEnd =
        document.getElementById("btn-end");

    elements.message =
        document.getElementById("message");

    elements.eventLog =
        document.getElementById("event-log");

    validateRequiredElements();
}

function validateRequiredElements() {
    const missingElements =
        Object.entries(elements)
            .filter(
                ([name, element]) => {
                    if (
                        name === "dialPadButtons"
                    ) {
                        return (
                            !Array.isArray(element)
                            || element.length !== 12
                        );
                    }

                    return !element;
                }
            )
            .map(([name]) => name);

    if (missingElements.length > 0) {
        throw new Error(
            `Elementos HTML ausentes: ${
                missingElements.join(", ")
            }`
        );
    }
}
