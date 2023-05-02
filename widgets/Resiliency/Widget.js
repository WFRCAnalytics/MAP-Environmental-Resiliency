var sRTPResiliencySegs = 'Environmental Risk - Line Projects' ;
var sRTPResiliencyPnts = 'Environmental Risk - Point Projects';
var sRTPResiliencySegs_Selected = 'Line Projects' ;
var sRTPResiliencyPnts_Selected = 'Point Projects';

// bins for scoring based on percent of max and bins for coloring layers
var lstBinLows           = [0.95     , 0.85     , 0.60     , 0.30     , 0.00     ];
var lstYellowToBlue      = ["#031273", "#2c7fb8", "#52c7d5", "#a1dab4", "#ffffcc"];
var lstYellowToBlue_Text = ["#FFFFFF", "#000000", "#FFFFFF", "#FFFFFF", "#000000"];

var fltrMode = 'All';
var curBuffer = 100; // default buffer
var curResultSort = 'length';
var segLengthMiles = 0.125; // from the data prep notebook

var jsonCats = 'widgets/Resiliency/data/cats.json'
var jsonLyrs = 'widgets/Resiliency/data/lyrs.json'
var jsonSegs = 'widgets/Resiliency/data/segs.json'
var jsonGIds = 'widgets/Resiliency/data/gids.json'
var jsonWithinBufferFolder = 'widgets/Resiliency/data/within_buffers/'

var WIDGETPOOLID_LEGEND = 2;
var WIDGETPOOLID_SCORE = 1;
var WIDGETPOOLID_REPORT = 0;

// initialize global variables
var aPrjBinCumLengths = [];
var aPrjBinCumLengthsPercent =[];
var sCurCommunities = "";
var dCurCommunities = [];
var lyrRTPResiliencySegs;
var lyrRTPResiliencySegs_Selected;
var lyrRTPResiliencyPnts;
var lyrRTPResiliencyPnts_Selected;
var strSelectedPriorities = '';
var numCats = 0;
var ctCats = 0;
var dWithinBuffers = [];
var dWithinBuffersIndex = [];
var curCheckedLayers = [];
var curCatWeights = [];
var curCatNumCheckedLayers = [];
var curCatBuffers =[];

var aPrjCatLength_Weighted = [];
var segScores = [];

var maxScore = 0; // max score of all segments... used for calculating bins and percentages, which are all relative to max

var curOpacity = 0.55;

var iPixelSelectionTolerance = 10;

//https://colors.artyclick.com/color-names-dictionary/color-names/light-navy-blue-color#:~:text=The%20color%20Light%20Navy%20Blue%20corresponds%20to%20the%20hex%20code%20%232E5A88.
var dBlues11bg = ["#FFFFFF","#DFE8F1","#C2D3E4","#A7BED7","#8EABC9","#7798BC","#6287AF","#4E76A1","#3D6794","#2D5987","#2D5987"]
var dBlues11fg = ["#2D5987","#2D5987","#2D5987","#2D5987","#FFFFFF","#FFFFFF","#DFE8F1","#DFE8F1","#DFE8F1","#DFE8F1","#DFE8F1"]

define(['dojo/_base/declare',
  'dojo/dom',
  'dojo/dom-style',
  'dojo/dom-construct',
  'dojo/on',
  'dijit/registry',
  'jimu/BaseWidget',
  'dijit/form/CheckBox',
  'dojo/html',
  'dojo/domReady!',
  'esri/layers/FeatureLayer',
  'jimu/LayerInfos/LayerInfos',
  'dijit/form/ToggleButton',
  'dijit/form/Select',
  'dijit/form/Button',
  'dijit/form/ComboBox',
  'dijit/form/HorizontalSlider',
  'esri/tasks/query',
  'esri/tasks/QueryTask',
  'esri/geometry/Extent',
  'esri/renderers/UniqueValueRenderer',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/SimpleLineSymbol',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/Color',
  'jimu/PanelManager',
  'esri/graphic',
  'dojo/store/Memory',
  'dijit/ProgressBar'],
  function (declare, dom, domStyle, domConstruct, on, registry, BaseWidget, CheckBox, html, domReady, FeatureLayer, LayerInfos, ToggleButton, Select, Button, ComboBox, HorizontalSlider, Query, QueryTask, Extent, UniqueValueRenderer, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color, PanelManager, Graphic, Memory, ProgressBar) {
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

      startup: function () {
        this.inherited(arguments);
        //this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');

        wR = this;
        //this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature

        // Initialize Selection Layer, FromLayer, and ToLayer and define selection colors
        var layerInfosObject = LayerInfos.getInstanceSync();
        for (var j = 0, jl = layerInfosObject._layerInfos.length; j < jl; j++) {
          var currentLayerInfo = layerInfosObject._layerInfos[j];
          if (currentLayerInfo.title == sRTPResiliencySegs) {
            lyrRTPResiliencySegs = layerInfosObject._layerInfos[j].layerObject;
            console.log(sRTPResiliencySegs + ' Found');
          } else if (currentLayerInfo.title == sRTPResiliencySegs_Selected) {
            lyrRTPResiliencySegs_Selected = layerInfosObject._layerInfos[j].layerObject;
            lyrRTPResiliencySegs_Selected.setDefinitionExpression("GIS_ID='NONE'");
            lyrRTPResiliencySegs_Selected.show();
            console.log(sRTPResiliencySegs_Selected + ' Found');
          } else if (currentLayerInfo.title == sRTPResiliencyPnts) {
            lyrRTPResiliencyPnts = layerInfosObject._layerInfos[j].layerObject;
            console.log(lyrRTPResiliencyPnts + ' Found');
          } else if (currentLayerInfo.title == sRTPResiliencyPnts_Selected) {
            lyrRTPResiliencyPnts_Selected = layerInfosObject._layerInfos[j].layerObject;
            lyrRTPResiliencyPnts_Selected.setDefinitionExpression("GIS_ID='NONE'");
            lyrRTPResiliencyPnts_Selected.show();
            console.log(sRTPResiliencyPnts_Selected + ' Found');
          }
        }

        // set current buffer
        dom.byId('bufferText').value = curBuffer;
        
        // set mode filter
        dom.byId('fltrMode').value = fltrMode;

        // Populate gisids object
        dojo.xhrGet({
          url: jsonGIds,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonGIds);
            dGIds = obj.data;
            wR._dirtyQuery();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate categories object
        dojo.xhrGet({
          url: jsonSegs,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonSegs);
            dSegs = obj.data;
            wR._dirtyQuery();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate categories object
        dojo.xhrGet({
          url: jsonCats,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonCats);
            dCats = obj.data;
            wR._buildMenu();
            numCats = dCats.length;
            wR._readWithinCurBuffer();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate layers object
        dojo.xhrGet({
          url: jsonLyrs,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonLyrs);
            dLyrs = obj.data;
            wR._buildMenu();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        //setup click functionality
        this.map.on('click', __selectProject);

        function pointToExtent(map, point, toleranceInPixel) {
          var pixelWidth = wR.map.extent.getWidth() / wR.map.width;
          var toleranceInMapCoords = toleranceInPixel * pixelWidth;
          return new Extent(point.x - toleranceInMapCoords,
            point.y - toleranceInMapCoords,
            point.x + toleranceInMapCoords,
            point.y + toleranceInMapCoords,
            wR.map.spatialReference);
        }

        //Setup function for selecting communities and parcels

        function __selectProject(evt) {
          console.log('__selectProject');

          // only run if results populated
          if(dom.byId('resultsheader').style.display=='') {
                      
            var query = new Query();  
            query.geometry = pointToExtent(parent.map, evt.mapPoint, iPixelSelectionTolerance);
            query.returnGeometry = false;
            query.outFields = ["*"];

            var tblqueryLine  = new QueryTask(lyrRTPResiliencySegs.url);
            var tblqueryPoint = new QueryTask(lyrRTPResiliencyPnts.url);
            
            //execute query
            tblqueryLine.execute(query,__showLineResults);
            setTimeout(function(){ tblqueryLine .execute(query,__showLineResults ); }, 500); //Use timeout function to execute segment query after intersection
            //execute query
            tblqueryPoint.execute(query,__showPointResults);
            setTimeout(function(){ tblqueryPoint.execute(query,__showPointResults); }, 500); //Use timeout function to execute segment query after intersection
            
            //Line search results
            function __showLineResults (results) {
              console.log('__showLineResults');
              var resultCount = results.features.length;
              if (resultCount>0) {
                var featureAttributes = results.features[0].attributes;
                var _gid = featureAttributes["GIS_ID"];
                wR._zoomToProjectAndShowScore(_gid,'seg',false);
              }
            }

            //Point search results
            function __showPointResults (results) {
              console.log('__showPointResults');
              var resultCount = results.features.length;
              if (resultCount>0) {
                var featureAttributes = results.features[0].attributes;
                var _gid = featureAttributes["GIS_ID"];
                wR._zoomToProjectAndShowScore(_gid,'pnt',false);
              }
            }
          }

        }


        var horizSlider = new HorizontalSlider({
          minimum: 0,
          maximum: 1,
          discreteValues: 21,
          value: curOpacity,
          intermediateChanges: true,
          onChange: function(){
            console.log(this.value);
            curOpacity = this.value;
            dom.byId("opa").innerHTML = ((curOpacity)*100).toFixed(0) + "%"
            wR._updateLayerDisplay();
          }
        }, "horizSlider");

        // Start up the widget
        dom.byId("opa").innerHTML = ((curOpacity)*100).toFixed(0) + "%"
        horizSlider.startup();

      },

      _dirtyQuery: function() {
        dom.byId('btnCalculateScores').style.backgroundColor = "red";
        dom.byId('btnCalculateScores').innerHTML = "Run Query";
        dom.byId('resultsheader').style.display='none';
        var vcUVRenderer_seg = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: "return 'class_0';",
          uniqueValueInfos: [
            { value: "class_0", label: "No Results"  , symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#dcdcdc"), 0.25)}
          ]
        });
        lyrRTPResiliencySegs.setRenderer(vcUVRenderer_seg);
        lyrRTPResiliencySegs_Selected.setDefinitionExpression("GIS_ID='NONE'");
        lyrRTPResiliencySegs_Selected.refresh();

        var vcUVRenderer_pnt = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: "return 'class_0';",
          uniqueValueInfos: [
            { value: "class_0", label: "No Results"  , symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 1, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,255,255]), 1), new Color("#dcdcdc"))}
          ]
        });
        lyrRTPResiliencyPnts.setRenderer(vcUVRenderer_pnt);
        lyrRTPResiliencyPnts_Selected.setDefinitionExpression("GIS_ID='NONE'");
        lyrRTPResiliencyPnts_Selected.refresh();

        if (typeof progressBar !== "undefined") {
          progressBar.destroyRecursive();
        }

        //Close Location Scores if open
        var pm = PanelManager.getInstance();
        for (var p = 0; p < pm.panels.length; p++) {
          if (pm.panels[p].label == 'Project Scores' || pm.panels[p].label == 'Report') {
            pm.closePanel(pm.panels[p]);
          }
        }

        
        var divProjects = dom.byId("projects");
          
        dojo.forEach(dijit.findWidgets(divProjects), function(w) {
          w.destroyRecursive();
        });
        
        dojo.empty(divProjects);

      },

      _updateFltrMode: function() {
        console.log('_updateFltrMode');
        fltrMode = dom.byId('fltrMode').value;
        if (fltrMode!='All') {
          lyrRTPResiliencySegs.setDefinitionExpression("MODE='" + fltrMode + "'")
          lyrRTPResiliencyPnts.setDefinitionExpression("MODE='" + fltrMode + "'")
          lyrRTPResiliencySegs.show()
          lyrRTPResiliencyPnts.show()
          wR._updateResults();
        } else {
          lyrRTPResiliencySegs.setDefinitionExpression("")
          lyrRTPResiliencyPnts.setDefinitionExpression("")
          lyrRTPResiliencySegs.show()
          lyrRTPResiliencyPnts.show()
          wR._updateResults();
        }
      },

      _updateBuffer: function() {
        console.log('_updateBuffer');
        curBuffer = parseInt(dom.byId('bufferText').value);
        for (c in dCats) {
          dom.byId('buffer' + dCats[c].CategoryCode).value = curBuffer;
        }
        wR._readWithinCurBuffer();
      },

      _readWithinCurBuffer: function() {
        curCatBuffers = wR._getCatBuffers();
        console.log('_readWithinCurBuffer');
        if (typeof dCats !== "undefined") {
          ctCats = 0;
          dWithinBuffers = [];
          dWithinBuffersIndex = [];
          for (c in dCats) {
            wR._readWithinBuffers(curCatBuffers[c],dCats[c].CategoryCode);
          }
        }
      },

      _readWithinBuffers: function(_buf,_cat) {
        if (typeof _buf==="undefined") {
          _buf = curBuffer;
        }
        console.log('_readWithinBuffers: buffer: ' + String(_buf) + ' category: ' + _cat);
        // Populate distances object
        dojo.xhrGet({
          // get next layer code
          url: jsonWithinBufferFolder + 'b' + parseInt(_buf) + '_' + _cat + '.json',
          handleAs: "json",
          load: function (obj) {
            console.log(this.url);
            /* here, obj will already be a JS object deserialized from the JSON response */
            dWithinBuffers.push(obj);
            dWithinBuffersIndex.push(this.url.substring(this.url.length - 7, this.url.length - 5));
            ctCats += 1;
            if (ctCats==numCats) {
              wR._dirtyQuery();
            }
          },
          error: function (err) {
            ctCats += 1;
            if (ctCats==numCats) {
              wR._dirtyQuery();
            }
            /* this will execute if the response couldn't be converted to a JS object,
              or if the request was unsuccessful altogether. */
          }
        });
      },

      _showLegend: function () {
        var pm = PanelManager.getInstance();
        pm.showPanel(wR.appConfig.widgetPool.widgets[WIDGETPOOLID_LEGEND]);
        //Close Location Scores if open
        var pm = PanelManager.getInstance();
        for (var p = 0; p < pm.panels.length; p++) {
          if (pm.panels[p].label == 'Location Scores') {
            pm.closePanel(pm.panels[p]);
          }
        }
      },

      //repeatOften: function() {
      //  // Do whatever
      //  requestAnimationFrame(wR.repeatOften());
      //},

      _calculateScores: function() {
        console.log('_calculateScores');


        dom.byId('btnCalculateScores').style.backgroundColor = "orange";
        dom.byId('btnCalculateScores').innerHTML = "Running Query...";


        //window.getComputedStyle(registry.byId('btnCalculateScores').domNode).getPropertyValue("opacity");
        
        maxScore = 0;

        if (typeof dGIds !== "undefined"  && typeof dSegs !== "undefined" && typeof dCats !== "undefined" && typeof dLyrs !== "undefined" && ctCats>0 && ctCats==numCats) {
          // change button color and text
        // change button color and text

          curCheckedLayers       = wR._getListCheckedLayers();
          curCatWeights          = wR._getCatWeights();
          curCatMaxOuts          = wR._getCatMaxOuts();
          curCatNumCheckedLayers = wR._getCatNumCheckedLayers();
          curCatBuffers          = wR._getCatBuffers();

          let start = Date.now();
          
          // Create a new progress bar widget and add it to the widget's container
          progressBar = new ProgressBar({
            value: 0,
            maximum: 100
          }, "divProgressBarContainer");
    
          // project array of the length of each impact per category
          aPrjCatLength_Weighted = [];

          // loop through all GIS_IDs
          for (g in dGIds) {
            progressBar.set('value', (g / (dGIds.length -1)) * 100);

            //wR.requestAnimationFrame(wR.repeatOften());

            // segment array of the length of each impact per category
            _catLength_Weighted = new Array(dCats.length).fill(0);

            //window.requestAnimationFrame();
            var _segs = dSegs.filter(o => o['g'] == dGIds[g].g);
            // loop through all sequences
            // search for seqs for GIds
            for (s in _segs) {
              _segScore = 0;
              var _index = dGIds[g].g + '_' + _segs[s].s;
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
                          _catLength_Weighted[c] +=  segLengthMiles / _divisor;
                        }
                      }
                    }
                    if (_divisor>0) {
                      var _segCatScore = _ctLyrsWithScore / _divisor * curCatWeights[c];
                    }
                    _segScore += _segCatScore;
                  }
                }
              }
              maxScore = Math.max(maxScore,_segScore);
            }
            aPrjCatLength_Weighted.push(_catLength_Weighted);
          }
          let end = Date.now();
          // elapsed time in milliseconds
          let elapsed = end - start;   
            
          // converting milliseconds to seconds 
          // by dividing 1000
          console.log('_calculateScores time: ' + String(elapsed/1000));
          console.log('max score: ' + parseFloat(maxScore))

          // update layer display
          wR._updateDisplay();

          // change button color and text
          dom.byId('btnCalculateScores').style.backgroundColor = "green";
          dom.byId('btnCalculateScores').innerHTML = "Query Complete";

          if (typeof progressBar !== "undefined") {
            progressBar.destroyRecursive();
          }

          // score the projects based on max score
          wR._scoreProjects();
        }
      },

      _scoreProjects: function() {
        console.log('_scoreProjects');

        dom.byId('resultsheader').style.display='';

        // make sure objects are defined before entering
        if (typeof dGIds !== "undefined"  && typeof dSegs !== "undefined" && typeof dCats !== "undefined" && typeof dLyrs !== "undefined" && ctCats>0 && ctCats==numCats) {
          
          curCheckedLayers       = wR._getListCheckedLayers();
          curCatWeights          = wR._getCatWeights();
          curCatMaxOuts          = wR._getCatMaxOuts();
          curCatNumCheckedLayers = wR._getCatNumCheckedLayers();
          curCatBuffers          = wR._getCatBuffers();

          let start = Date.now();

          aPrjBinCumLengths        = [];
          aPrjBinCumLengthsPercent = [];

          // loop through all GIS_IDs
          for (g in dGIds) {
            var _projLength = 0;
            var _segs = dSegs.filter(o => o['g'] == dGIds[g].g);
            // loop through all sequences
            // search for seqs for GIds

            var _dSegBinCumLengths = new Array(lstBinLows.length + 1).fill(0); // add one for the seg index

            for (var s=0; s<_segs.length; s++) {
              _segScore = 0;
              if (s==_segs.length) {
                _segLength = segLengthMiles / 2; // assume last segment is 1/2 seg length, since last seg is always a remant... so for random seg length, 1/2 should be average... don't care too much about it, and don't want to slow down processing to get actual length of final segment
              } else {
                _segLength = segLengthMiles;
              }

              _projLength += _segLength;

              var _index = dGIds[g].g + '_' + _segs[s].s;
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
              }
              _segScorePercentMax = _segScore / maxScore;

              // add distance to correct cummulative bins
              for (b in lstBinLows) {
                if (_segScorePercentMax >= lstBinLows[b]) {
                  _dSegBinCumLengths[b] += _segLength;
                }
              }

            }
            // add seg index
            _dSegBinCumLengths[_dSegBinCumLengths.length - 1] = g;

            // push seg bin lengths to array
            aPrjBinCumLengths.push(_dSegBinCumLengths);
            
            var arrTemp = _dSegBinCumLengths.slice(0, -1).map(num => num / _projLength);
            arrTemp.push(parseFloat(_dSegBinCumLengths[_dSegBinCumLengths.length - 1]));
            // calculate percent and push 
            // divide all but last element by project length
            aPrjBinCumLengthsPercent.push(arrTemp);

          }
          let end = Date.now();
          // elapsed time in milliseconds
          let elapsed = end - start;

          wR._updateResults();
        }
      },

      _updateResults: function() {
        console.log('_updateResults');

        var divProjects = dom.byId("projects");
          
        dojo.forEach(dijit.findWidgets(divProjects), function(w) {
          w.destroyRecursive();
        });
        
        dojo.empty(divProjects);
        
        aPrjBinCumLengths.sort((a, b) => {
          if (b[0] !== a[0]) {
            return b[0] - a[0];
          } else if (b[1] !== a[1]) {
            return b[1] - a[1];
          } else if (b[2] !== a[2]) {
            return b[2] - a[2];
          } else if (b[3] !== a[3]) {
            return b[3] - a[3];
          } else if (b[4] !== a[4]) {
            return b[4] - a[4];
          } else {
            return b[5] - a[5];
          }
        });
        
        aPrjBinCumLengthsPercent.sort((a, b) => {
          if (b[0] !== a[0]) {
            return b[0] - a[0];
          } else if (b[1] !== a[1]) {
            return b[1] - a[1];
          } else if (b[2] !== a[2]) {
            return b[2] - a[2];
          } else if (b[3] !== a[3]) {
            return b[3] - a[3];
          } else if (b[4] !== a[4]) {
            return b[4] - a[4];
          } else {
            return b[5] - a[5];
          }
        });

        _ctRank = 1;
        _ctElements = 1;

        if (curResultSort=='length') {
          aSortProjects = aPrjBinCumLengths;
        } else if (curResultSort=='percent') {
          aSortProjects = aPrjBinCumLengthsPercent;
        }

        dojo.place("<hr\><b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Rank&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Plan ID and Project Name</b><hr\>", "projects");

        for (p=0; p<aSortProjects.length; p++) {

          if (p>0) {

            // check if same score as previous
            if (aSortProjects[p].slice(0, -1).every((element, index) => element === aSortProjects[p-1].slice(0, -1)[index])) {
              // don't do anything since if they have the same scores, they should be the same rank
            } else {
              _ctRank = _ctElements;
            }
          }

          _ctElements++;

          //if (_ctRank<=10) {
          //  sBGColor="#ED2024";
          //  sFGColor="#FFFFFF";
          //} else if (_ctRank<=25) {
          //  sBGColor="#37A949";
          //  sFGColor="#FFFFFF";
          //} else if (_ctRank<=50) {
          //  sBGColor="#37C2F1";
          //  sFGColor="#FFFFFF";
          //} else {
          //  sBGColor="";
          //  sFGColor="";
          //}
          
          _gID     = dGIds[parseInt(aSortProjects[p][5])].g;
          _prjName = dGIds[parseInt(aSortProjects[p][5])].n;
          _plnId   = dGIds[parseInt(aSortProjects[p][5])].p;
          _gIndex  = dGIds.findIndex(obj => obj.g==_gID)

          // check if project is in fltrMode
          if (fltrMode=='All' | dGIds.find(o => o['g'] == _gID).m == fltrMode) {
            
            var button3 = new Button({ label:String(_ctRank), id:"button_" + String(aSortProjects[p][5])});
            button3.startup();
            button3.placeAt(projects);
            button3.on("click", this._clickProjectButton);
            
            dojo.style("button_" + aSortProjects[p][5],"width","40px");
            dojo.style("button_" + aSortProjects[p][5],"height","16px");
            //if (sBGColor!="") {
            //  dojo.style("button_" + aSortProjects[p][5],"background",sBGColor);
            //}
            //if (sFGColor!="") {
            //  dojo.style("button_" + aSortProjects[p][5],"color",sFGColor);
            //}

            //var _strAdditionalText = " <small>" + aPrjCatLength_Weighted[_gIndex].map(ele => ele.toFixed(1)) + "</small>";
            var _strAdditionalText = ""
            dojo.place("<div class = \"projectitem\" >&nbsp;&nbsp;" + _plnId + ': ' + _prjName + _strAdditionalText + "</div></br>", "projects");            
          }

          //dojo.create("div", { id:, innerHTML: "<p>hi</p>" }, "divResults");
          
          //divResults.innerHTML += "</br>";
          
          // Change the cursor back to its default style
          
        }
        dojo.place("</br></br></br>", "projects");

        // update report
        wR.publishData({
          message: 'report'
        });
      },

      _updateDisplay: function () {
        console.log('_updateDisplay');

        // build expression for symbology based on each categories rank

        _scoreExp = "var totScore = 0;";
        _scoreExp += "var catScore = 0;";
        _scoreExp += "var ctLyr    = 0;";

        for (c in dCats) {
          _curbuf = String(curCatBuffers[c]);
          _weight = String(curCatWeights[c]);
          _maxOut = curCatMaxOuts[c];
          _numChk = curCatNumCheckedLayers[c];

          _lyrs = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
          
          _divisor = String(Math.min(_numChk, _maxOut));

          _scoreExp += "catScore = 0;";
          _scoreExp += "ctLyr    = 0;";
          for (l in _lyrs) {
            if (curCheckedLayers.indexOf(_lyrs[l].LayerCode)>=0) {
              _scoreExp += "if ($feature." + _lyrs[l].LayerCode + " >= 0 && $feature." + _lyrs[l].LayerCode + " < " + _curbuf + " && ctLyr < " + _maxOut + " && " + _divisor + ">0) {" +
                          " catScore +=  " + _weight + " / " + _divisor + ";" +
                          " ctLyr += 1;" +
                          "}";
            }
          }
          _scoreExp += "totScore += catScore;"
        }

        var vcUVRenderer_seg = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: _scoreExp + "" +
            "var score = (totScore) /" + maxScore + ";" +
            "if      (score>=" + String(lstBinLows[0]) + ") { return 'class_5'; }" +
            "else if (score>=" + String(lstBinLows[1]) + ") { return 'class_4'; }" +
            "else if (score>=" + String(lstBinLows[2]) + ") { return 'class_3'; }" +
            "else if (score>=" + String(lstBinLows[3]) + ") { return 'class_2'; }" +
            "else if (score>=" + String(lstBinLows[4]) + ") { return 'class_1'; }",
          uniqueValueInfos: [
            { value: "class_5", label: String(lstBinLows[0] * 100) +                                 "-100% of Max Score", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[0]), 5)},
            { value: "class_4", label: String(lstBinLows[1] * 100) + "-" + String(lstBinLows[0] * 100) + "% of Max Score", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[1]), 4)},
            { value: "class_3", label: String(lstBinLows[2] * 100) + "-" + String(lstBinLows[1] * 100) + "% of Max Score", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[2]), 3)},
            { value: "class_2", label: String(lstBinLows[3] * 100) + "-" + String(lstBinLows[2] * 100) + "% of Max Score", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[3]), 2)},
            { value: "class_1", label: String(lstBinLows[4] * 100) + "-" + String(lstBinLows[3] * 100) + "% of Max Score", symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[4]), 1)}
          ]
        });
        var vcUVRenderer_pnt = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: _scoreExp + "" +
            "var score = (totScore) /" + maxScore + ";" +
            "if      (score>=" + String(lstBinLows[0]) + ") { return 'class_5'; }" +
            "else if (score>=" + String(lstBinLows[1]) + ") { return 'class_4'; }" +
            "else if (score>=" + String(lstBinLows[2]) + ") { return 'class_3'; }" +
            "else if (score>=" + String(lstBinLows[3]) + ") { return 'class_2'; }" +
            "else if (score>=" + String(lstBinLows[4]) + ") { return 'class_1'; }",
          uniqueValueInfos: [
            { value: "class_5", label: String(lstBinLows[0] * 100) +                                 "-100% of Max Score", symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[4]), .5), new Color(lstYellowToBlue[0]))},
            { value: "class_4", label: String(lstBinLows[1] * 100) + "-" + String(lstBinLows[0] * 100) + "% of Max Score", symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[3]), .5), new Color(lstYellowToBlue[1]))},
            { value: "class_3", label: String(lstBinLows[2] * 100) + "-" + String(lstBinLows[1] * 100) + "% of Max Score", symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[2]), .5), new Color(lstYellowToBlue[2]))},
            { value: "class_2", label: String(lstBinLows[3] * 100) + "-" + String(lstBinLows[2] * 100) + "% of Max Score", symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[1]), .5), new Color(lstYellowToBlue[3]))},
            { value: "class_1", label: String(lstBinLows[4] * 100) + "-" + String(lstBinLows[3] * 100) + "% of Max Score", symbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(lstYellowToBlue[0]), .5), new Color(lstYellowToBlue[4]))}
          ]
        });
        lyrRTPResiliencyPnts.setRenderer(vcUVRenderer_pnt);
        lyrRTPResiliencySegs.setRenderer(vcUVRenderer_seg);
        lyrRTPResiliencyPnts.show();
        lyrRTPResiliencySegs.show();
      },

      //Run when receiving a message
      onReceiveData: function (name, widgetId, data, historyData) {
        //filter out messages
        if (name == 'Location Score') {
          //if (data.message == 'remove_location') {
          //  if (bLocationGraphic) {
          //    // should only be one graphic in addition to communities at a time (community borders and selection)
          //    // so remove the last
          //    wR.map.graphics.remove(wR.map.graphics.graphics[wR.map.graphics.graphics.length - 1]);
          //    bLocationGraphic = false;
          //  }
          //}
          return;
        }
      },

      _uncheckAll: function () {
        console.log('_uncheckAll')
        _curState = dom.byId(turnoffall).innerHTML;
        for (l in dLyrs) {
          if (_curState=='Uncheck All' && dom.byId('chk' + dLyrs[l].LayerCode).checked==true) {
            dom.byId('chk' + dLyrs[l].LayerCode).checked = false;
            wR._dirtyQuery();
            dom.byId(turnoffall).innerHTML = 'Check All';
          } else if (_curState=='Check All' && dom.byId('chk' + dLyrs[l].LayerCode).checked==false) {
            dom.byId('chk' + dLyrs[l].LayerCode).checked = true;
            wR._dirtyQuery();
            dom.byId(turnoffall).innerHTML = 'Uncheck All';
          }
        }
        wR._updateLayerDisplay();
      },


      _buildMenu: function() {
        console.log('_buildMenu');
        

        // check if data object populated
        if (typeof dCats !== "undefined" && typeof dLyrs !== "undefined") {

          var divMenu = dom.byId("menu");
          
          dojo.forEach(dijit.findWidgets(divMenu), function(w) {
            w.destroyRecursive();
          });
          
          dojo.empty(divMenu);

          dojo.place("<hr/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Category&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Weight<hr/>", "menu");

          for (c in dCats) {

            divCatHeaderName = "catContainer" + dCats[c].CategoryCode
            var divCatHeader = domConstruct.create("div",{id:divCatHeaderName, class:"container"});
            divMenu.appendChild(divCatHeader);

            divCatExpandButtonName = "catExpandButton" + dCats[c].CategoryCode
            var divCatExpandButton = domConstruct.create("div",{id:divCatExpandButtonName, class:"first"});
            divCatHeader.appendChild(divCatExpandButton);

            divCatTitleName = "catTitle" + dCats[c].CategoryCode
            var divCatTitle = domConstruct.create("div",{id:divCatTitleName, class:"static"});
            divCatHeader.appendChild(divCatTitle);

            divCatWeightName = "catWeight" + dCats[c].CategoryCode
            var divCatWeight = domConstruct.create("div",{id:divCatWeightName, class:"third"});
            divCatHeader.appendChild(divCatWeight);

            bId = "button" + dCats[c].CategoryCode;

            var button3 = new Button({ label:'▶', id:bId, style:"display:inline"});

            button3.startup();
            button3.placeAt(divCatExpandButton);
            button3.on("click", this._expand);

            dojo.style(bId,"width","18px");
            dojo.style(bId,"height","16px");
            //dojo.style(bId,"display","inline-block");

            //dojo.style(bId,"background",sBGColor);
            //dojo.style(bId,"color",sFGColor);
            
            // category heading
            dojo.place("<div id=\"title" + dCats[c].CategoryCode +  "\">" + dCats[c].CategoryName + "</div>", divCatTitleName);
            
            // Create a new select element
            var mySelect = document.createElement("select");

            for (var i = 10; i>=0; i--) {
              // Add options to the select element
              var option = document.createElement("option");
              option.text = String(i);
              option.style.backgroundColor = dBlues11bg[i];
              option.style.color           = dBlues11fg[i];
              mySelect.add(option);
            }
            mySelect.value = "10";

            mySelect.classList.add("my-dropdown");
            mySelect.id = "selectWeight" + dCats[c].CategoryCode;
            mySelect.style.backgroundColor = dBlues11bg[10];
            mySelect.style.color           = dBlues11fg[10];

            mySelect.addEventListener("change", function() {
              console.log("weight onChange");
              wR._updateCatTitle(this.id.slice(-2),this.value);
              wR._updateLayerDisplay();
              wR._dirtyQuery();
            });

            // Append the select element to an existing element on the page
            //var myDiv = document.getElementById("menu");
            divCatWeight.appendChild(mySelect);

            divCatName = "cat" + dCats[c].CategoryCode

            var divCat = domConstruct.create("div",{id:divCatName});
            divCat.style.display='none';
            divMenu.appendChild(divCat);

            // layers div
            dojo.place("<div style=\"display: none;\" id=\"div" + dCats[c].CategoryCode +  "\"", divCatName);

            // category weight
            //dojo.place("<span style=\"display: flex; justify-content: flex-end\">Weight:&nbsp;</span>", divCatName);
            
            // weight heading
            //dojo.place("<br/>", divCatName);
            dojo.place("<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<small><b>Buffer Override:</b></small>&nbsp;</span>", divCatName);
            //dojo.place("<hr/>, divCatName);
            
            // Create a new select element
            var mySelect_Buffer = document.createElement("select");

            var mySelect_Buffer_options =  [{value:100,text:"100"},
                                            {value:200,text:"200"},
                                            {value:300,text:"300"},
                                            {value:400,text:"400"},
                                            {value:500,text:"500"},
                                            {value:600,text:"600"}];

            // Loop through options and add them to select element
            for (var i = 0; i < mySelect_Buffer_options.length; i++) {
              var option = document.createElement("option");
              option.value = mySelect_Buffer_options[i].value;
              option.text  = mySelect_Buffer_options[i].text;
              mySelect_Buffer.add(option);
            }

            // initial value is curBuffer
            mySelect_Buffer.value = curBuffer;
            curCatBuffers.push(curBuffer);

            mySelect_Buffer.classList.add("my-dropdown");
            mySelect_Buffer.id = "buffer" + dCats[c].CategoryCode;

            mySelect_Buffer.addEventListener("change", function() {
              console.log("category buffer onChange");
              wR._readWithinCurBuffer();
              wR._dirtyQuery();
            });

            dom.byId(divCatName).appendChild(mySelect_Buffer);

            dojo.place("<span>&nbsp;&nbsp;<div id=\"maxoutLabel" + dCats[c].CategoryCode + "\" style=\"display: inline;\">&nbsp;&nbsp;&nbsp;<small><b>Max Out #:</b></small></div>&nbsp;</span>", divCatName);

            _layers = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
            _numlayers = _layers.length;


            // Create a new select element
            var mySelect_MaxOut = document.createElement("select");

            mySelect_MaxOut.classList.add("my-dropdown");
            mySelect_MaxOut.id = "maxout" + dCats[c].CategoryCode;

            mySelect_MaxOut.addEventListener("change", function() {
              console.log("maxout onChange");
              wR._updateLayerDisplay();
              wR._dirtyQuery();
            });

            dom.byId(divCatName).appendChild(mySelect_MaxOut);

            dojo.place("<br/><br/><span>&nbsp;&nbsp;&nbsp;&nbsp;<b>Include Layers:</b></span>", divCatName);
            dojo.place("<br/>", divCatName)
            dojo.place("<br/>", divCatName)

            for (l in _layers) {
              //dojo.place("<p style=\"display:inline\">&nbsp;&nbsp;</p>", divCatName);
              
              var divToggle = domConstruct.create("div",{id:"toggle" + _layers[l].LayerCode});
              divCat.appendChild(divToggle);
              var _checkbox = "<span>&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"chk" + _layers[l].LayerCode + "\" checked data-dojo-type=\"dijit/form/CheckBox\"> <label for=\"chk" + _layers[l].LayerCode + "\">" + _layers[l].ListName + "</label></span><br/>";
              dojo.place(_checkbox, divToggle);
              var option = document.createElement("option");
              option.value = String(_numlayers - l);
              option.text  = String(_numlayers - l);
              mySelect_MaxOut.add(option);
            }

            mySelect_MaxOut.value = Math.min(4,_numlayers);

            if (_layers.length<=1) {
              // Hide the select element
              mySelect_MaxOut.style.display = "none";
              dom.byId("maxoutLabel" + dCats[c].CategoryCode).style.display = "none";
            }

            dojo.place("<br/>", divCatName)
          }

          for (l in dLyrs) {
            dom.byId('chk' + dLyrs[l].LayerCode).onchange = function(){
              wR._dirtyQuery();
              wR._updateLayerDisplay();
            };
          }
          
          wR._updateLayerDisplay();
          wR._dirtyQuery();
        }

      },

      _updateCatTitle: function(_c, _w) {
        console.log('_updateCatTitle');
        var mySelectById = document.getElementById('selectWeight' + _c);
        mySelectById.style.backgroundColor = dBlues11bg[parseInt(_w)];
        mySelectById.style.color           = dBlues11fg[parseInt(_w)];
        mySelectById.value = _w;
      },

      _getCatWeights: function() {
        console.log('_getCatWeights');
        var _lstCatWeights = [];
        for (c in dCats) {
          var wd = dom.byId('selectWeight' + dCats[c].CategoryCode);
          _lstCatWeights.push(parseInt(wd.value));
        }
        return _lstCatWeights;
      },

      _getCatBuffers: function() {
        console.log('_getCatBuffers');
        var _lstCatBuffers = [];
        for (c in dCats) {
          var wd = dom.byId('buffer' + dCats[c].CategoryCode);
          if (wd!==null) {
            _lstCatBuffers.push(parseInt(wd.value));
          }
        }
        return _lstCatBuffers;
      },

      _getCatMaxOuts: function() {
        console.log('_getCatMaxOuts');
        var _lstCatMaxOuts = [];
        for (c in dCats) {
          var wd = dom.byId('maxout' + dCats[c].CategoryCode);
          if (wd.textContent!=='') {
            _lstCatMaxOuts.push(parseInt(wd.textContent));
          } else {
            _lstCatMaxOuts.push(0);
          }
        }
        return _lstCatMaxOuts;
      },

      _getListCheckedLayers: function() {
        console.log('_getListCheckedLayers');
        var _lstCheckedLayers = [];
        for (l in dLyrs) {
          if (dom.byId('chk' + dLyrs[l].LayerCode).checked==true) {
            _lstCheckedLayers.push(dLyrs[l].LayerCode);
          }
        }
        return _lstCheckedLayers;
      },

      _getCatNumCheckedLayers: function() {
        console.log('_getCatNumCheckedLayers');
        var _lstCatNumCheckedLayers = [];
        for (c in dCats) {
          ctLyrs = 0;
          var _layers = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
          for (l in _layers) {
            if (dom.byId('chk' + _layers[l].LayerCode).checked==true) {
              ctLyrs += 1;
            }
          }
          _lstCatNumCheckedLayers.push(ctLyrs);
        }
        return _lstCatNumCheckedLayers;
      },

      _updateLayerDisplay: function() {
        console.log('_updateLayerDisplay');

        curCheckedLayers       = wR._getListCheckedLayers();
        curCatWeights          = wR._getCatWeights();
        curCatMaxOuts          = wR._getCatMaxOuts();
        curCatNumCheckedLayers = wR._getCatNumCheckedLayers();

        var layerInfosObject = LayerInfos.getInstanceSync();
        
        for (c in dCats) {
          ctLyrs = 0;
          var _layers = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
          for (l in _layers) {
            for (var j = 0, jl = layerInfosObject._layerInfos.length; j < jl; j++) {
              var currentLayerInfo = layerInfosObject._layerInfos[j];
              if (currentLayerInfo.title == _layers[l].LayerName) {
                var _lyr = layerInfosObject._layerInfos[j].layerObject;
                if (dom.byId('chk' + _layers[l].LayerCode).checked==true) {
                  var _checktolimit = Math.min(curCatNumCheckedLayers[c], curCatMaxOuts[c])
                  var _opacity = curOpacity * (1 / _checktolimit) * (curCatWeights[c] / 10);  
                  _lyr.setOpacity(_opacity)
                  _lyr.show();
                } else {
                  _lyr.hide();
                }
              }
            }
          }
        }
      },

      _expand: function() {
        console.log('_expand');

        //var myBut = registry.byId("button" + this.id.slice(-2));
        //var divCat = dom.byId("cat" + this.id.slice(-2));
        
        var clickedCat = this.id.slice(-2)

        for (c in dCats) {

          myBut = registry.byId("button" + dCats[c].CategoryCode);
          divCat = dom.byId("cat" + dCats[c].CategoryCode);
          
          if (divCat.style.display=='none' && clickedCat==dCats[c].CategoryCode) {
            divCat.style.display='block';
            myBut.set('label','▼');
          } else {
            divCat.style.display='none';
            myBut.set('label','▶');
          }
        }
      },

      _clickProjectButton: function() {
        var _gid = dGIds[this.id.substring(this.id.indexOf("_") + 1)].g;
        console.log('ID: ' + _gid);
        wR._zoomToProjectAndShowScore(_gid,dGIds[this.id.substring(this.id.indexOf("_") + 1)].x,true);
      },
        
      _zoomToProjectAndShowScore: function(_gid,_type,_zoom) {
        console.log('_zoomToProjectAndShowScore');

        if (_type=='seg') {
          queryTask = new esri.tasks.QueryTask(lyrRTPResiliencySegs.url);
          lyrRTPResiliencySegs_Selected.setDefinitionExpression("GIS_ID = '" + _gid + "'");
          lyrRTPResiliencyPnts_Selected.setDefinitionExpression("GIS_ID = 'NONE'");
        } else if (_type=='pnt') {
          queryTask = new esri.tasks.QueryTask(lyrRTPResiliencyPnts.url);
          lyrRTPResiliencyPnts_Selected.setDefinitionExpression("GIS_ID = '" + _gid + "'");
          lyrRTPResiliencySegs_Selected.setDefinitionExpression("GIS_ID = 'NONE'");
        }

        query = new esri.tasks.Query();
        query.returnGeometry = true;
        query.outFields = ["*"];
        query.where = "GIS_ID = '" + _gid + "'";
        
        if (_zoom) {
          queryTask.execute(query, __zoomToProject);
        }
        
        function __zoomToProject(featureSet) {
          
          var feature, featureId;
          
          //QueryTask returns a featureSet.  Loop through features in the featureSet and add them to the map.
          lyrRTPResiliencySegs.clearSelection();
          
          if (featureSet.features[0].geometry.type == "polyline" || featureSet.features[0].geometry.type == "polygon"){ 
            //clearing any graphics if present. 
            //wR.map.graphics.clear(); 
            newExtent = new Extent(featureSet.features[0].geometry.getExtent()) 
            for (i = 0; i < featureSet.features.length; i++) { 
              var graphic = featureSet.features[i]; 
              var thisExtent = graphic.geometry.getExtent(); 

              // making a union of extent or previous feature and current feature. 
              newExtent = newExtent.union(thisExtent); 
            } 
            wR.map.setExtent(newExtent.expand(1.5)); 
          } else if (featureSet.features[0].geometry.type == "point"){ 
            //clearing any graphics if present. 
            var point = featureSet.features[0].geometry;
            wR.map.centerAndZoom(point, 15); // Replace 'map' with your map object
          }
        }

        // Open scoring widget
        var pm = PanelManager.getInstance();

        //Open scoring widget
        pm.showPanel(wR.appConfig.widgetPool.widgets[WIDGETPOOLID_SCORE]);

        // show score
        wR.publishData({
          message: _gid
        });
      },
      
      _changeResultsSort: function() {
        console.log('_changeResultsSort');
        curResultSort = document.querySelector('input[name="resultsSort"]:checked').value;
        wR._updateResults();
      },

      _openReport:function() {
        console.log('_openReport')
        // Open scoring widget
        var pm = PanelManager.getInstance();

        //Close Segment Widget if open
        //for (var p=0; p < pm.panels.length; p++) {
        //    if (pm.panels[p].label == sSegWidgetLabel) {
        //        pm.closePanel(pm.panels[p]);
        //      }
        //}

        //Open scoring widget
        pm.showPanel(wR.appConfig.widgetPool.widgets[WIDGETPOOLID_REPORT]);
        
      }

      // onOpen: function(){
      //   console.log('onOpen');
      // },

      // onClose: function(){
      //   console.log('onClose');
      // },

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