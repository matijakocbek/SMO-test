





// Audio functions
async function toggleAudio() {
    if (audioContext && audioContext.state === 'running') {
        if (isPaused) {
            await audioContext.resume();
            isPaused = false;
            // Update Guify control or UI feedback if necessary
        } else {
            audioContext.suspend();
            isPaused = true;
        }
    } else if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        isPaused = false;
    } else {
        await startAudio();
    }
}


async function startAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    const aubioModule = await aubio();
    pitchDetector = new aubioModule.Pitch("default", 4096, hopSize, audioContext.sampleRate);

    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    scriptProcessor.addEventListener("audioprocess", event => {
        let frequency = pitchDetector.do(event.inputBuffer.getChannelData(0));
        let loudness = calculateLoudness(event.inputBuffer.getChannelData(0));
        let avgLoudness = averageLoudness(loudness);
        
        // Update live data display
        document.getElementById("liveFrequency").textContent = `Frequency: ${frequency ? frequency.toFixed(2) : 'N/A'}`;
        document.getElementById("liveLoudness").textContent = `Loudness: ${isFinite(loudness) ? loudness.toFixed(2) : 'N/A'} dB`;
    
        if (frequency || keepDrawing) {
            if (frequency) {
                frequency = averageFrequency(frequency);
            }
            let hue = mapFrequencyToHue(frequency, frequencyRange[0], frequencyRange[1]);
            let color = getColorBasedOnLoudness(frequency, avgLoudness);
            spectrogram.push(color);
            drawSpectrogram();
        }
    });
}

function reset() {
    if (audioContext) {
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        audioContext = null;
    }
    spectrogram = [];
    isPaused = false;
    // Reset any necessary Guify controls or UI feedback
    drawSpectrogram();
}

// Calculation functions
function averageFrequency(frequency) {
    frequencyBuffer.push(frequency);
    if (frequencyBuffer.length > bufferSize) {
        frequencyBuffer.shift();
    }
    return frequencyBuffer.reduce((a, b) => a + b) / frequencyBuffer.length;
}

function getNote(frequency) {
    const note = 12 * (Math.log(frequency / middleA) / Math.log(2));
    return Math.round(note) + semitone;
}

function calculateLoudness(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
    }
    let rms = Math.sqrt(sum / samples.length);
    let dB = 20 * Math.log10(rms);
    return dB;
}

function averageLoudness(loudness) {
    loudnessBuffer.push(loudness);
    if (loudnessBuffer.length > loudnessBufferSize) {
        loudnessBuffer.shift();
    }
    return loudnessBuffer.reduce((a, b) => a + b) / loudnessBuffer.length;
}


    function getColorBasedOnLoudness(frequency, loudness) {
        let loudnessThresholdHigh = loudnessTresholdRange[0];
        let loudnessThresholdLow = loudnessTresholdRange[1];
        let lightness;
        if (loudness > loudnessThresholdHigh) {
            lightness = map(loudness, loudnessThresholdHigh, maxDecibels, 50, 0);
        } else if (loudness < loudnessThresholdLow) {
            lightness = map(loudness, minDecibels, loudnessThresholdLow, 100, 50);
        } else {
            lightness = 50;
        }
    
        if (useFullSpectrum || !frequency) {
            let hue = frequency ? mapFrequencyToHue(frequency, minFrequency, maxFrequency) : 0;
            return color(hue, 100, lightness);
        } else {
            let t = map(frequency, minFrequency, maxFrequency, 0, 1);
            let segment = 1 / (numGradientColors - 1);
            let p0, p1, i;
    
            for (i = 0; i < numGradientColors - 1; i++) {
                if (t >= i * segment && t <= (i + 1) * segment) {
                    p0 = customColorsHSL[i];
                    p1 = customColorsHSL[i + 1];
                    break;
                }
            }
    
            if (typeof p0 === 'undefined' || typeof p1 === 'undefined') {
                return color(0, 0, lightness);  // return a color based on lightness alone
            }
    
            let tSegment = map(t, i * segment, (i + 1) * segment, 0, 1);
            let h = lerp(p0.h, p1.h, tSegment);
            let s = lerp(p0.s, p1.s, tSegment);
            let l = lightness;
    
            let col = color(h, s, l);
    
            return col;
        }
    }



function cubicHermite(t, p0, p1, m0, m1) {
    let t2 = t * t;
    let t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

function mapFrequencyToHue(frequency) {
    // Use frequencyRange[0] for minFrequency and frequencyRange[1] for maxFrequency
    let minFrequency = frequencyRange[0];
    let maxFrequency = frequencyRange[1];

    frequency = Math.min(Math.max(frequency, minFrequency), maxFrequency);
    return ((frequency - minFrequency) / (maxFrequency - minFrequency)) * 360;
}


// Drawing functions
function drawSpectrogram() {
    background(0);
    colorMode(HSL);
    for (let i = 0; i < spectrogram.length; i++) {
        let avgColor = averageAdjacentColors(i, blurLevel);
        stroke(avgColor);
        strokeWeight(lineThickness); // Set the thickness of the line
        line(i * lineThickness, 0, i * lineThickness, height);
    }
}

function averageAdjacentColors(index, level) {
    let hSum = 0, sSum = 0, lSum = 0, count = 0;
    for (let i = index - level; i <= index + level; i++) {
        if (i >= 0 && i < spectrogram.length) {
            let col = spectrogram[i];
            hSum += hue(col);
            sSum += saturation(col);
            lSum += lightness(col);
            count++;
        }
    }
    return color(hSum / count, sSum / count, lSum / count);
}
