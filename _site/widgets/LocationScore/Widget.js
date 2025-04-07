define(['dojo/_base/declare',
        'dojo/dom',
        'jimu/BaseWidget',
        'dijit/form/CheckBox',
        'dojo/html',
        'dojo/domReady!',
        'jimu/LayerInfos/LayerInfos',
        'dijit/form/Select',
        'esri/tasks/query',
        'esri/tasks/QueryTask'],
function(declare, dom, BaseWidget, CheckBox, html, domReady, LayerInfos, Select, Query, QueryTask) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
    // Custom widget code goes here

    baseClass: 'jimu-widget-customwidget',

    //this property is set by the framework when widget is loaded.
    //name: 'CustomWidget',


    //methods to communication with app container:

    // postCreate: function() {
    //   this.inherited(arguments);
    //   console.log('postCreate');
    // },

    startup: function() {
        this.inherited(arguments);
        //this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');
        
        wPS = this;
        //this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature
        //wPS._updateProjectScore();

                
        var panel = this.getPanel();
        var pos = panel.position;
        pos.width = 420;
        panel.setPosition(pos);
        panel.panelManager.normalizePanel(panel);

        wPS._updateProjectScore(curPrj);

    },

    _updateProjectScore: function(_g) {
        console.log('_updateProjectScore');
        
        // make sure objects are defined before entering
        if (typeof dGIds !== "undefined"  && typeof dSegs !== "undefined" && typeof dCats !== "undefined" && typeof dLyrs !== "undefined" && ctCats>0 && ctCats==numCats) {
            
            curCheckedLayers       = wR._getListCheckedLayers();
            curCatWeights          = wR._getCatWeights();
            curCatMaxOuts          = wR._getCatMaxOuts();
            curCatNumCheckedLayers = wR._getCatNumCheckedLayers();

            let start = Date.now();

            var _projLength = 0;

            var _p     = dGIds[parseInt(dGIds.findIndex(obj => obj.g==_g))].p;
            var _n     = dGIds[parseInt(dGIds.findIndex(obj => obj.g==_g))].n;
            _innerHTML = "<b>Max Score: " + maxScore.toFixed(1) + "</b>";
            _innerHTML += "<h1><b>" + _p + ": " + _n + " Scores</b></h1>";
            _innerHTML += "<br/>";

            var _segs = dSegs.filter(o => o['g'] == _g);
            // loop through all sequences
            // search for seqs for GIds

            var _dSegBinCumLengths = new Array(lstBinLows.length + 1).fill(0); // add one for the seg index

            _innerHTML += "<table width=100%>";

            for (var s=0; s<_segs.length; s++) {
                // header row repeated every 30 rows
                if (s % 30 === 0) {
                    _innerHTML += "<tr>";
                    _innerHTML += "<td><b>Seg</b></td><td><b>%Max</b></td><td><b>Score</b></td>";
                    _innerHTML += "<td>" + dCats.map(item => item.CategoryCode).map(item => "<td align=\"center\"><b>" + item + "</b></td>").join(''); + "</td>"
                    _innerHTML += "</tr>"                }
                _segScore = 0;
                if (s==_segs.length) {
                    _segLength = segLengthMiles / 2; // assume last segment is 1/2 seg length, since last seg is always a remant... so for random seg length, 1/2 should be average... don't care too much about it, and don't want to slow down processing to get actual length of final segment
                } else {
                    _segLength = segLengthMiles;
                }

                _projLength += _segLength;

                var _index = _g + '_' + _segs[s].s;

                var _aCatScores = [];

                for (c in dCats) {
                    var _withinBuffers = dWithinBuffers[dWithinBuffersIndex.indexOf(dCats[c].CategoryCode)]
                    var _ctLyrsWithScore = 0;
                    var _segCatScore = 0;

                    var _divisor = Math.min(curCatMaxOuts[c],curCatNumCheckedLayers[c])

                    if (typeof _withinBuffers !== "undefined") {
                        var _withinBufferRec = _withinBuffers[_index];
                        if (typeof _withinBufferRec !== "undefined") {
                            var _withinLayers = _withinBufferRec[dCats[c].CategoryCode].split(',');
                            for (_w in _withinLayers) {
                                if (curCheckedLayers.indexOf(_withinLayers[_w])>=0) {
                                    if (_ctLyrsWithScore < curCatMaxOuts[c]) {
                                        _ctLyrsWithScore += 1;
                                    }
                                }
                            }
                            if (_divisor>0) {
                                var _segCatScore = _ctLyrsWithScore / _divisor * curCatWeights[c];
                            }
                            _segScore += _segCatScore;
                            
                        }
                    }

                    // add distance to correct cummulative bins
                    for (b in lstBinLows) {
                        if (_segScorePercentMax >= lstBinLows[b]) {
                            _dSegBinCumLengths[b] += _segLength;
                        }
                    }
                    _aCatScores.push(_segCatScore);
                }

                _segScorePercentMax = _segScore / maxScore;

                var _bgColor  = lstYellowToBlue     [lstYellowToBlue.length - 1]
                var _txtColor = lstYellowToBlue_Text[lstYellowToBlue.length - 1];

                // get color for % of max
                for (b in lstBinLows) {
                    if(_segScorePercentMax>lstBinLows[b]) {
                        var _bgColor  = lstYellowToBlue     [b];
                        var _txtColor = lstYellowToBlue_Text[b]; // get opposite color for text
                        break;
                    }
                }

                _innerHTML += "<tr><td align=\"right\">" + _segs[s].s + "</td><td style=\"background-color:" + _bgColor + ";\" align=\"right\"><span style=\"color:" + _txtColor + ";\">" + String(Math.round(_segScorePercentMax*100)) + "%</span></td><td align=\"right\">" + String(_segScore.toFixed(1)) + "</td><td><small>" + _aCatScores.map(item => "<td align=\"right\">" + item.toFixed(1).replace('0.0', '-').replace('.0', '').replace('1-', '10') + "</small></td>").join(''); + "</td></tr>";

                let end = Date.now();
                // elapsed time in milliseconds
                let elapsed = end - start;

                //dom.byId("equation").innerHTML += _dSegBinCumLengths + "<br/>";
            }
            _innerHTML += "</table>"
            dom.byId("equation").innerHTML = _innerHTML;
        }
    },
    
    //Run onOpen when receiving a message from OremLayerSymbology
    onReceiveData: function(name, widgetId, data, historyData) {
        //filter out messages
        if(name !== 'Resiliency'){
            return;
        }
        if (data.message !== 'report') {
          wPS._updateProjectScore(data.message);
        }
    },

    // onOpen: function(){
    //   console.log('onOpen');
    // },

    onClose: function(){
        console.log('onClose');

        wPS.publishData({
            message: "remove_location"
      });

    },

    // onMinimize: function(){
    //   console.log('onMinimize');
    // },

    // onMaximize: function(){
    //   console.log('onMaximize');
    // },

    // onSignIn: function(credential){
    //   /* jshint unused:false*/
    //   console.log('onSignIn');
    // },

    // onSignOut: function(){
    //   console.log('onSignOut');
    // }

    // onPositionChange: function(){
    //   console.log('onPositionChange');
    // },

    // resize: function(){
    //   console.log('resize');
    // }
    });
  });