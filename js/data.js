// Data processing and repeater link parsing functionality

function parseRepeaterLinks() {
    AppState.repeaterLinks = [];
    const linkMap = new Map();
    const processedPairs = new Set();
    const nonValidatedLinks = [];

    // Classify repeaters into intertie, system, and frequency-linked groups
    const intertieRepeaters = [];
    const systemRepeaters = {};

    AppState.allRepeaters.forEach(repeater => {
        if (!repeater.lat || !repeater.lon) return;

        const linkFreqText = (repeater.link_freq || '').toLowerCase();

        if (linkFreqText.includes('intertie')) {
            intertieRepeaters.push(repeater);
            return;
        }

        const systemType = getSystemType(linkFreqText);
        if (systemType) {
            if (!systemRepeaters[systemType]) {
                systemRepeaters[systemType] = [];
            }
            systemRepeaters[systemType].push(repeater);
            return;
        }

        // Process frequency-based links
        processFrequencyLinks(repeater, linkMap, processedPairs, nonValidatedLinks);
    });

    createIntertieLinks(intertieRepeaters);
    createSystemLinks(systemRepeaters);

    AppState.nonValidatedLinks = nonValidatedLinks;
}

function processFrequencyLinks(repeater, linkMap, processedPairs, nonValidatedLinks) {
    const linkFrequencies = extractLinkFrequencies(repeater);

    linkFrequencies.forEach(linkFreq => {
        const potentialMatches = findAllRepeatersByFrequency(linkFreq);
        const validMatches = potentialMatches.filter(match =>
            match !== repeater && match.lat && match.lon
        );

        if (validMatches.length === 0) return;

        let foundBidirectionalLink = false;

        validMatches.forEach(linkedRepeater => {
            const pairKey = createPairKey(repeater, linkedRepeater);
            if (processedPairs.has(pairKey)) return;

            const reverseLinks = extractLinkFrequencies(linkedRepeater);
            const repeaterFreq = parseFloat(repeater.frequency || repeater.output_frequency);

            const hasReverseLink = reverseLinks.some(freq =>
                parseFloat(freq) === parseFloat(repeaterFreq)
            );

            if (hasReverseLink) {
                const linkKey = [repeater.call, linkedRepeater.call].sort().join('-');
                if (!linkMap.has(linkKey)) {
                    linkMap.set(linkKey, true);
                    processedPairs.add(pairKey);
                    AppState.repeaterLinks.push({
                        from: repeater,
                        to: linkedRepeater,
                        type: 'frequency',
                        linkFreq: linkFreq
                    });
                    foundBidirectionalLink = true;
                }
            }
        });

        // Non-validated single match
        if (!foundBidirectionalLink && validMatches.length === 1) {
            const linkedRepeater = validMatches[0];
            const pairKey = createPairKey(repeater, linkedRepeater);
            const linkKey = [repeater.call, linkedRepeater.call].sort().join('-');
            if (!linkMap.has(linkKey) && !processedPairs.has(pairKey)) {
                processedPairs.add(pairKey);
                nonValidatedLinks.push({
                    from: repeater,
                    to: linkedRepeater,
                    type: 'non-validated',
                    linkFreq: linkFreq
                });
            }
        }
    });
}

function createIntertieLinks(intertieRepeaters) {
    for (let i = 0; i < intertieRepeaters.length; i++) {
        for (let j = i + 1; j < intertieRepeaters.length; j++) {
            AppState.repeaterLinks.push({
                from: intertieRepeaters[i],
                to: intertieRepeaters[j],
                type: 'intertie'
            });
        }
    }
}

function createSystemLinks(systemRepeaters) {
    Object.entries(systemRepeaters).forEach(([systemType, repeaters]) => {
        for (let i = 0; i < repeaters.length; i++) {
            for (let j = i + 1; j < repeaters.length; j++) {
                AppState.repeaterLinks.push({
                    from: repeaters[i],
                    to: repeaters[j],
                    type: 'system',
                    systemType: systemType
                });
            }
        }
    });
}

// Helper function to create a unique pair key
function createPairKey(repeater1, repeater2) {
    const id1 = `${repeater1.call}-${repeater1.frequency || repeater1.output_frequency}`;
    const id2 = `${repeater2.call}-${repeater2.frequency || repeater2.output_frequency}`;
    return [id1, id2].sort().join('<->');
}

function getSystemType(linkFreqText) {
    if (linkFreqText.includes(SYSTEM_TYPES.CACTUS)) return SYSTEM_TYPES.CACTUS;
    if (linkFreqText.includes(SYSTEM_TYPES.BARC)) return SYSTEM_TYPES.BARC;
    if (linkFreqText.includes(SYSTEM_TYPES.SDARC)) return SYSTEM_TYPES.SDARC;
    return null;
}

function extractLinkFrequencies(repeater) {
    const frequencies = [];
    const linkFreqField = repeater.link_freq || '';

    if (linkFreqField) {
        const patterns = [
            /L\s*(\d+\.?\d*)/gi,
            /Link\s*(\d+\.?\d*)/gi,
            /Linked?\s*:?\s*(\d+\.?\d*)/gi,
            /(\d+\.\d+)/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(linkFreqField)) !== null) {
                const freq = parseFloat(match[1]);
                const isValidFreq = LINK_FREQ_RANGES.some(r => freq >= r.min && freq <= r.max);
                if (isValidFreq) {
                    frequencies.push(freq);
                }
            }
        });
    }

    return [...new Set(frequencies)];
}

function findRepeaterByFrequency(frequency) {
    return AppState.allRepeaters.find(repeater => {
        const outputFreq = parseFloat(repeater.frequency || repeater.output_frequency);
        const inputFreq = parseFloat(repeater.input_frequency);
        return Math.abs(outputFreq - frequency) < 0.001 ||
               Math.abs(inputFreq - frequency) < 0.001;
    });
}

function findAllRepeatersByFrequency(frequency) {
    return AppState.allRepeaters.filter(repeater => {
        const outputFreq = parseFloat(repeater.frequency || repeater.output_frequency);
        const inputFreq = parseFloat(repeater.input_frequency);
        return Math.abs(outputFreq - frequency) < 0.001 ||
               Math.abs(inputFreq - frequency) < 0.001;
    });
}
