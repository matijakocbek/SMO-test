var isPaused = false;
var keepDrawing = true;
var liveFrequency = "N/A";
var liveLoudness = "N/A";
var drawDirection = 'Horizontal';
var frequencyRange = [80, 500];
var bufferSize = 20;
var loudnessBufferSize = 10;
var loudnessTresholdRange = [-20, -10];
var decibelsRange = [-50, -4];
var blurLevel = 0;
var lineThickness = 2;
var hopSize = 6;
var numGradientColors = 3;
var useFullSpectrum = false;
var rgbColor001 = 'rgb(255, 0, 0)';
var rgbColor002 = 'rgb(255, 0, 0)';
var rgbColor003 = 'rgb(255, 0, 0)';
var rgbColor004 = 'rgb(255, 0, 0)';
var rgbColor005 = 'rgb(255, 0, 0)';

var canvas, audioContext, analyser, scriptProcessor, pitchDetector, stream;
var middleA = 440, semitone = 69;
var customColorsHSL = [
    { h: 306, s: 100, l: 50 },
    { h: 240, s: 100, l: 50 },
    { h: 199, s: 100, l: 50 },
    { h: 120, s: 100, l: 50 },
    { h: 60, s: 100, l: 50 }
];
var frequencyBuffer = [], loudnessBuffer = [], spectrogram = [];


var container = document.getElementById("smo-container");
        console.log(this);

        // Create the GUI
        var gui = new guify({
            title: 'SMO Art Maker',
            theme: 'light', // dark, light, yorha, or theme object
            align: 'left', // left, right
            width: 350,
            barMode: 'overlay', // none, overlay, above, offset
            panelMode: 'inner',
            opacity: 0.95,
            root: container,
            open: true
        });

        // Populate the GUI

        gui.Register({
            type: 'folder',
            label: 'Record Controls',
            open: true
        });

        gui.Register([
            {
                type: 'button',
                label: 'Record/Pause',
                action: () => {
                    toggleAudio();
                }
            },
            {
                type: 'button',
                label: 'Reset',
                action: () => {
                    reset();
                }
            },
            {
                type: 'display',
                label: 'Live Frequency',
                object: this,
                property: 'liveFrequency'
            },
            {
                type: 'display',
                label: 'Live Loudness',
                object: this,
                property: 'liveLoudness'
            },
            {
                type: 'checkbox',
                label: 'Autostart',
                object: this,
                property: 'isPaused',
                onChange: (data) => {
                console.log(isPaused);
            }
            },
            {
                type: 'checkbox',
                label: 'Keep Drawing',
                object: this,
                property: 'keepDrawing',
                onChange: (data) => {
                console.log(keepDrawing);
            }
            },
            {
                type: 'select',
                label: 'Draw Direction',
                object: this,
                property: 'drawDirection',
                options: ['Horizontal', 'Vertical'],
                onChange: (data) => {
                    console.log(drawDirection);
                }
            },
        ], {
                folder: 'Record Controls'
            });

        


        gui.Register({
            type: 'folder',
            label: 'Sound Settings',
            open: false
        });

        // Add to the folder example
        gui.Register([
            {
                type: 'interval',
                label: 'Frequency Range',
                min: 80, max: 500, step: 1,
                object: this, property: "frequencyRange",
                onChange: (data) => {
                    console.log(frequencyRange);
                }
            },
            {
                type: 'range',
                label: 'Buffer Size',
                min: 0, max: 200, step: 1,
                object: this, property: "bufferSize",
                onChange: (data) => {
                    console.log(bufferSize);
                }
            },
            {
                type: 'range',
                label: 'Loudness Buffer Size',
                min: 0, max: 100, step: 1,
                object: this, property: "loudnessBufferSize",
                onChange: (data) => {
                    console.log(loudnessBufferSize);
                }
            },
            {
                type: 'interval',
                label: 'Loudness Treshold',
                min: -20, max: -10, step: 1,
                object: this, property: "loudnessTresholdRange",
                onChange: (data) => {
                    console.log(loudnessTreshold);
                }
            },
            {
                type: 'interval',
                label: 'Decibels Range',
                min: -60, max: 20, step: 1,
                object: this, property: "decibelsRange",
                onChange: (data) => {
                    console.log(decibelsRange);
                }
            },
        ], {
                folder: 'Sound Settings'
            });

            gui.Register({
                type: 'folder',
                label: 'Color Settings',
                open: false
            });

        // Add to the folder example
        gui.Register([
            {
                type: 'range',
                label: 'Blur Level',
                min: 0, max: 100, step: 1,
                object: this, property: "blurLevel",
                onChange: (data) => {
                    console.log(blurLevel);
                }
            },
            {
                type: 'range',
                label: 'Line Thickness',
                min: 1, max: 20, step: 1,
                object: this, property: "lineThickness",
                onChange: (data) => {
                    console.log(lineThickness);
                }
            },
            {
                type: 'range',
                label: 'Hop Size',
                min: 1, max: 20, step: 1,
                object: this, property: "hopSize",
                onChange: (data) => {
                    console.log(hopSize);
                }
            },
            {
                type: 'checkbox',
                label: 'Use Full Spectrum',
                object: this,
                property: 'useFullSpectrum',
                onChange: (data) => {
                console.log(useFullSpectrum);
            }
            },
            {
                type: 'range',
                label: 'No. of Colors',
                min: 1, max: 5, step: 1,
                object: this, property: "numGradientColors",
                onChange: (data) => {
                    console.log(numGradientColors);
                }
            },
            {
                type: 'color',
                label: 'Color 001',
                format: 'rgb',
                object: this,
                property: 'rgbColor001'
            },
            {
                type: 'color',
                label: 'Color 002',
                format: 'rgb',
                object: this,
                property: 'rgbColor002'
            },
            {
                type: 'color',
                label: 'Color 003',
                format: 'rgb',
                object: this,
                property: 'rgbColor003'
            },
            {
                type: 'color',
                label: 'Color 004',
                format: 'rgb',
                object: this,
                property: 'rgbColor004'
            },
            {
                type: 'color',
                label: 'Color 005',
                format: 'rgb',
                object: this,
                property: 'rgbColor005'
            },
        ], {
                folder: 'Color Settings'
            });




