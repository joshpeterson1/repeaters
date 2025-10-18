// Data processing and repeater link parsing functionality

function parseRepeaterLinks() {
    repeaterLinks = [];
    const linkMap = new Map(); // Track bidirectional links
    const intertieRepeaters = [];
    const systemRepeaters = {}; // Track system repeaters by type
    const failedBidirectionalLinks = [];
    const nonValidatedLinks = []; // Track single-match failed links for optional display
    const processedPairs = new Set(); // Track processed pairs to avoid duplicates
    
    allRepeaters.forEach(repeater => {
        if (!repeater.lat || !repeater.lon) return;
        
        // Check for intertie systems - only check link_freq field
        const linkFreqText = (repeater.link_freq || '').toLowerCase();
        
        if (linkFreqText.includes('intertie')) {
            intertieRepeaters.push(repeater);
            return;
        }
        
        // Check for other system links (Cactus, BARC, SDARC)
        const systemType = getSystemType(linkFreqText);
        if (systemType) {
            // Add to system repeaters with type
            if (!systemRepeaters[systemType]) {
                systemRepeaters[systemType] = [];
            }
            systemRepeaters[systemType].push(repeater);
            return;
        }
        
        // Parse link frequencies from various fields
        const linkFrequencies = extractLinkFrequencies(repeater);
        
        linkFrequencies.forEach(linkFreq => {
            // Find ALL repeaters that match this frequency
            const potentialMatches = findAllRepeatersByFrequency(linkFreq);
            const validMatches = potentialMatches.filter(match => 
                match !== repeater && match.lat && match.lon
            );
            
            if (validMatches.length > 0) {
                let foundBidirectionalLink = false;
                
                // Check each potential match for bidirectional validation
                validMatches.forEach(linkedRepeater => {
                    // Create a unique pair key to avoid processing the same pair twice
                    const pairKey = createPairKey(repeater, linkedRepeater);
                    if (processedPairs.has(pairKey)) {
                        return; // Skip if we've already processed this pair
                    }
                    
                    const reverseLinks = extractLinkFrequencies(linkedRepeater);
                    const repeaterFreq = parseFloat(repeater.frequency || repeater.output_frequency);
                    
                    // Validation check: ${repeater.call} -> ${linkedRepeater.call}
                    
                    // Check if the linked repeater references back to this repeater's frequency
                    const hasReverseLink = reverseLinks.some(freq => {
                        const freq1 = parseFloat(freq);
                        const freq2 = parseFloat(repeaterFreq);
                        return freq1 === freq2;
                    });
                    
                    if (hasReverseLink) {
                        // Found bidirectional link
                        const linkKey = [repeater.call, linkedRepeater.call].sort().join('-');
                        
                        if (!linkMap.has(linkKey)) {
                            linkMap.set(linkKey, true);
                            processedPairs.add(pairKey);
                            repeaterLinks.push({
                                from: repeater,
                                to: linkedRepeater,
                                type: 'frequency',
                                linkFreq: linkFreq
                            });
                            foundBidirectionalLink = true;
                            // Bidirectional link found: ${repeater.call} <-> ${linkedRepeater.call}
                        }
                    }
                });
                
                // If no bidirectional links found, check for non-validated single match
                if (!foundBidirectionalLink && validMatches.length === 1) {
                    const linkedRepeater = validMatches[0];
                    const pairKey = createPairKey(repeater, linkedRepeater);
                    
                    // Only add if this pair isn't already in validated links and hasn't been processed
                    const linkKey = [repeater.call, linkedRepeater.call].sort().join('-');
                    if (!linkMap.has(linkKey) && !processedPairs.has(pairKey)) {
                        processedPairs.add(pairKey);
                        nonValidatedLinks.push({
                            from: repeater,
                            to: linkedRepeater,
                            type: 'non-validated',
                            linkFreq: linkFreq
                        });
                        // Non-validated single link: ${repeater.call} -> ${linkedRepeater.call}
                    }
                }
                
                // Log failed bidirectional attempts for debugging
                if (!foundBidirectionalLink) {
                    const failedLink = {
                        call: repeater.call,
                        frequency: repeater.frequency || repeater.output_frequency,
                        location: repeater.location || repeater.general_location,
                        linkFreq: linkFreq,
                        potentialMatches: validMatches.map(match => ({
                            call: match.call,
                            frequency: match.frequency || match.output_frequency,
                            location: match.location || match.general_location
                        }))
                    };
                    
                    failedBidirectionalLinks.push(failedLink);
                }
            }
        });
    });
    
    // Create intertie links (all-to-all for intertie repeaters)
    for (let i = 0; i < intertieRepeaters.length; i++) {
        for (let j = i + 1; j < intertieRepeaters.length; j++) {
            repeaterLinks.push({
                from: intertieRepeaters[i],
                to: intertieRepeaters[j],
                type: 'intertie'
            });
        }
    }
    
    // Create system links (all-to-all for each system type)
    Object.entries(systemRepeaters).forEach(([systemType, repeaters]) => {
        for (let i = 0; i < repeaters.length; i++) {
            for (let j = i + 1; j < repeaters.length; j++) {
                repeaterLinks.push({
                    from: repeaters[i],
                    to: repeaters[j],
                    type: 'system',
                    systemType: systemType
                });
            }
        }
    });
    
    // Store non-validated links globally for map rendering
    window.nonValidatedLinks = nonValidatedLinks;
    
    // Link validation results available in Stats for Nerds modal
    
    // Found repeater links and intertie connections
}

// Helper function to create a unique pair key
function createPairKey(repeater1, repeater2) {
    // Create a unique key for this pair that's consistent regardless of order
    const id1 = `${repeater1.call}-${repeater1.frequency || repeater1.output_frequency}`;
    const id2 = `${repeater2.call}-${repeater2.frequency || repeater2.output_frequency}`;
    return [id1, id2].sort().join('<->');
}

function getSystemType(linkFreqText) {
    // Check for system keywords in link_freq field
    if (linkFreqText.includes('cactus')) return 'cactus';
    if (linkFreqText.includes('barc')) return 'barc';
    if (linkFreqText.includes('sdarc')) return 'sdarc';
    return null;
}

function extractLinkFrequencies(repeater) {
    const frequencies = [];
    
    // Only check the link_freq field
    const linkFreqField = repeater.link_freq || '';
    
    if (linkFreqField) {
        // Look for frequency patterns in the link_freq field
        const patterns = [
            /L\s*(\d+\.?\d*)/gi,           // L147.12, L 146.52
            /Link\s*(\d+\.?\d*)/gi,       // Link 447.9
            /Linked?\s*:?\s*(\d+\.?\d*)/gi, // Linked: 146.52
            /(\d+\.\d+)/g                 // Any frequency pattern like 146.52, 53.15, etc.
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(linkFreqField)) !== null) {
                const freq = parseFloat(match[1]);
                // Validate frequency ranges for amateur radio
                if ((freq >= 28 && freq <= 29.7) ||    // 10m
                    (freq >= 50 && freq <= 54) ||      // 6m
                    (freq >= 144 && freq <= 148) ||    // 2m
                    (freq >= 222 && freq <= 225) ||    // 1.25m
                    (freq >= 420 && freq <= 450) ||    // 70cm
                    (freq >= 902 && freq <= 928) ||    // 33cm
                    (freq >= 1240 && freq <= 1300)) {  // 23cm
                    frequencies.push(freq);
                }
            }
        });
    }
    
    return [...new Set(frequencies)]; // Remove duplicates
}

function findRepeaterByFrequency(frequency) {
    return allRepeaters.find(repeater => {
        const outputFreq = parseFloat(repeater.frequency || repeater.output_frequency);
        const inputFreq = parseFloat(repeater.input_frequency);
        
        return Math.abs(outputFreq - frequency) < 0.001 || 
               Math.abs(inputFreq - frequency) < 0.001;
    });
}

function findAllRepeatersByFrequency(frequency) {
    return allRepeaters.filter(repeater => {
        const outputFreq = parseFloat(repeater.frequency || repeater.output_frequency);
        const inputFreq = parseFloat(repeater.input_frequency);
        
        return Math.abs(outputFreq - frequency) < 0.001 || 
               Math.abs(inputFreq - frequency) < 0.001;
    });
}
