// Export functionality for various formats

function exportKML() {
    if (filteredRepeaters.length === 0) {
        showMessage('No repeaters to export', 'error');
        return;
    }

    const kml = generateKML(filteredRepeaters);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utah_repeaters.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`Exported ${filteredRepeaters.length} repeaters to KML`, 'success');
    closeExportModal();
}

function exportCSV() {
    if (filteredRepeaters.length === 0) {
        showMessage('No repeaters to export', 'error');
        return;
    }

    const csv = generateCSV(filteredRepeaters);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utah_repeaters_filtered.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`Exported ${filteredRepeaters.length} repeaters to CSV`, 'success');
    closeExportModal();
}

function exportKX3() {
    if (filteredRepeaters.length === 0) {
        showMessage('No repeaters to export', 'error');
        return;
    }

    const kx3xml = generateKX3XML(filteredRepeaters);
    const blob = new Blob([kx3xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utah_repeaters_kx3.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`Exported ${filteredRepeaters.length} repeaters to KX3 format`, 'success');
    closeExportModal();
}

function exportChirp() {
    if (filteredRepeaters.length === 0) {
        showMessage('No repeaters to export', 'error');
        return;
    }

    const chirpCsv = generateChirpCSV(filteredRepeaters);
    const blob = new Blob([chirpCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utah_repeaters_chirp.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`Exported ${filteredRepeaters.length} repeaters to CHIRP format`, 'success');
    closeExportModal();
}

function generateKX3XML(repeaters) {
    let xml = `<?xml version="1.0" standalone="yes"?>
<K3ME xmlns="http://elecraft.com/K3MEDataSet.xsd">`;

    repeaters.forEach((repeater, index) => {
        if (!repeater.frequency) return; // Skip if no frequency
        
        const freq = parseFloat(repeater.frequency);
        const offset = parseOffset(repeater.offset);
        const ctcss = parseCTCSS(repeater.ctcss);
        const label = generateLabel(repeater);
        const description = `${repeater.general_location || repeater.location || ''} ${repeater.sponsor || ''}`.trim();
        
        // Determine mode based on frequency
        const mode = freq < 30 ? 'USB' : 'FM';
        
        // Calculate flags based on offset and CTCSS
        let flags4 = 0;
        if (mode === 'FM') {
            if (offset !== 0 && ctcss > 0) {
                flags4 = offset > 0 ? 5 : 6; // +offset+tone or -offset+tone
            } else if (offset !== 0) {
                flags4 = offset > 0 ? 1 : 2; // +offset or -offset
            } else if (ctcss > 0) {
                flags4 = 4; // tone only
            }
        }

        xml += `
  <FrequencyMemory>
    <ID>${index}</ID>
    <Label>${escapeXML(label)}</Label>
    <ModeA>${mode}</ModeA>
    <ModeB>${mode}</ModeB>
    <Description>${escapeXML(description)}</Description>`;

        if (offset !== 0) {
            xml += `
    <RepeaterOffset>${offset > 0 ? '+' : ''}${offset}</RepeaterOffset>`;
        }

        if (ctcss > 0) {
            xml += `
    <PLTone>${ctcss}</PLTone>`;
        }

        xml += `
    <VfoA>${freq}</VfoA>
    <VfoB>${freq}</VfoB>`;

        if (flags4 > 0) {
            xml += `
    <Flags4>${flags4}</Flags4>`;
        }

        xml += `
  </FrequencyMemory>`;
    });

    xml += `
</K3ME>`;

    return xml;
}

function generateChirpCSV(repeaters) {
    // CHIRP CSV format headers
    let csv = 'Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment,URCALL,RPT1CALL,RPT2CALL\n';
    
    repeaters.forEach((repeater, index) => {
        if (!repeater.frequency) return; // Skip if no frequency
        
        const freq = parseFloat(repeater.frequency);
        const offset = parseOffset(repeater.offset);
        const ctcss = parseCTCSS(repeater.ctcss);
        
        // Determine duplex setting
        let duplex = '';
        if (offset > 0) duplex = '+';
        else if (offset < 0) duplex = '-';
        
        // Format offset as absolute value in MHz
        const offsetMHz = Math.abs(offset);
        
        // Determine tone mode
        let tone = '';
        let rToneFreq = '';
        let cToneFreq = '';
        if (ctcss > 0) {
            tone = 'Tone';
            rToneFreq = ctcss.toString();
            cToneFreq = ctcss.toString();
        }
        
        // Create name from call sign and location
        const name = `${repeater.call || 'RPT'} ${(repeater.general_location || repeater.location || '').substring(0, 10)}`.trim();
        
        // Create comment with additional info
        const commentParts = [];
        if (repeater.sponsor) commentParts.push(repeater.sponsor);
        if (repeater.site_name) commentParts.push(repeater.site_name);
        if (repeater.info) commentParts.push(repeater.info);
        const comment = commentParts.join(' | ').substring(0, 50); // Limit comment length
        
        // Build CSV row
        const row = [
            index + 1, // Location (memory number)
            `"${name}"`, // Name
            freq.toFixed(6), // Frequency
            duplex, // Duplex
            offsetMHz > 0 ? offsetMHz.toFixed(6) : '', // Offset
            tone, // Tone
            rToneFreq, // rToneFreq
            cToneFreq, // cToneFreq
            '', // DtcsCode
            'NN', // DtcsPolarity
            'FM', // Mode
            '5.00', // TStep (5kHz for VHF/UHF)
            '', // Skip
            `"${comment}"`, // Comment
            '', // URCALL
            '', // RPT1CALL
            '' // RPT2CALL
        ];
        
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

function parseOffset(offsetStr) {
    if (!offsetStr || offsetStr === 'N/A' || offsetStr === '') return 0;
    
    // Handle common offset formats
    const cleanOffset = offsetStr.replace(/[^\d\.\-\+]/g, '');
    const offset = parseFloat(cleanOffset);
    
    if (isNaN(offset)) return 0;
    
    // Convert kHz to MHz if needed (assume values > 10 are in kHz)
    if (Math.abs(offset) > 10) {
        return offset / 1000;
    }
    
    return offset;
}

function parseCTCSS(ctcssStr) {
    if (!ctcssStr || ctcssStr === 'N/A' || ctcssStr === '') return 0;
    
    // Extract numeric value from CTCSS string
    const match = ctcssStr.match(/(\d+\.?\d*)/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    return 0;
}

function generateLabel(repeater) {
    // Create a short label for the repeater
    let label = '';
    
    if (repeater.call) {
        // Use call sign, truncate if too long
        label = repeater.call.substring(0, 8);
    } else if (repeater.frequency) {
        // Use frequency as fallback
        label = repeater.frequency.toString();
    } else {
        label = 'RPT';
    }
    
    return label;
}

function generateCSV(repeaters) {
    if (repeaters.length === 0) return '';
    
    // Get all unique field names from all repeaters
    const allFields = new Set();
    repeaters.forEach(repeater => {
        Object.keys(repeater).forEach(key => {
            // Skip internal fields we added for processing
            if (key !== 'lat' && key !== 'lon') {
                allFields.add(key);
            }
        });
    });
    
    const fieldNames = Array.from(allFields).sort();
    
    // Create CSV header
    let csv = fieldNames.map(field => `"${field}"`).join(',') + '\n';
    
    // Add data rows
    repeaters.forEach(repeater => {
        const row = fieldNames.map(field => {
            const value = repeater[field] || '';
            // Escape quotes and wrap in quotes
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

function generateKML(repeaters) {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>Utah Repeaters</name>
    <description>Utah VHF Society Repeater List</description>
    
    <Style id="repeaterIcon">
        <IconStyle>
            <Icon>
                <href>http://maps.google.com/mapfiles/kml/shapes/electronics.png</href>
            </Icon>
        </IconStyle>
    </Style>
`;

    repeaters.forEach(repeater => {
        if (repeater.lat && repeater.lon) {
            const name = `${repeater.call} - ${repeater.frequency}`;
            const description = `
<![CDATA[
<b>Call Sign:</b> ${repeater.call}<br/>
<b>Frequency:</b> ${repeater.frequency} MHz<br/>
<b>Offset:</b> ${repeater.offset}<br/>
<b>CTCSS:</b> ${repeater.ctcss}<br/>
<b>Location:</b> ${repeater.general_location}<br/>
<b>Site:</b> ${repeater.site_name}<br/>
<b>Sponsor:</b> ${repeater.sponsor}<br/>
<b>Elevation:</b> ${repeater.elevation}<br/>
<b>Info:</b> ${repeater.info}<br/>
${repeater.links ? `<b>Links:</b> ${repeater.links}<br/>` : ''}
${repeater.distance ? `<b>Distance:</b> ${repeater.distance} miles<br/>` : ''}
]]>
            `;

            kml += `
    <Placemark>
        <name>${escapeXML(name)}</name>
        <description>${description}</description>
        <styleUrl>#repeaterIcon</styleUrl>
        <Point>
            <coordinates>${repeater.lon},${repeater.lat},0</coordinates>
        </Point>
    </Placemark>`;
        }
    });

    kml += `
</Document>
</kml>`;

    return kml;
}

function escapeXML(str) {
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
