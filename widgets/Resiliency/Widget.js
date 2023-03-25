jsonCats = 'widgets/Resiliency/data/cats.json'
jsonLyrs = 'widgets/Resiliency/data/lyrs.json'
jsonDist = 'widgets/Resiliency/data/dist/WETL.json'
jsonSeqs = 'widgets/Resiliency/data/seqs.json'
jsonGIds = 'widgets/Resiliency/data/gids.json'

var sCurCommunities = "";
var dCurCommunities = [];
var lyrRTPResiliencySegs;
var lyrRTPResiliencySegs_Selected;
var sRTPResiliencySegs = 'RTP Resiliency Segments';
var sRTPResiliencySegs_Selected = 'RTP Resiliency Projects Selected';

var WIDGETPOOLID_LEGEND = 0;
var WIDGETPOOLID_SCORE = 2;

var strSelectedPriorities = '';

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
  'dojo/store/Memory'],
  function (declare, dom, domStyle, domConstruct, on, registry, BaseWidget, CheckBox, html, domReady, FeatureLayer, LayerInfos, ToggleButton, Select, Button, ComboBox, Query, QueryTask, Extent, UniqueValueRenderer, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color, PanelManager, Graphic, Memory) {
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
        this.map.setInfoWindowOnClick(false); // turn off info window (popup) when clicking a feature

        // Initialize Selection Layer, FromLayer, and ToLayer and define selection colors
        var layerInfosObject = LayerInfos.getInstanceSync();
        for (var j = 0, jl = layerInfosObject._layerInfos.length; j < jl; j++) {
          var currentLayerInfo = layerInfosObject._layerInfos[j];
          if (currentLayerInfo.title == sRTPResiliencySegs) {
            lyrRTPResiliencySegs = layerInfosObject._layerInfos[j].layerObject;
            console.log(sRTPResiliencySegs + ' Found');
          } else if (currentLayerInfo.title == sRTPResiliencySegs_Selected) {
            lyrRTPResiliencySegs_Selected = layerInfosObject._layerInfos[j].layerObject;
            lyrRTPResiliencySegs_Selected.setDefinitionExpression("CommCode IN ('NONE')");
            lyrRTPResiliencySegs_Selected.show();
            console.log(sRTPResiliencySegs_Selected + ' Found');
          }
        }

        // Populate gisids object
        dojo.xhrGet({
          url: jsonGIds,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonGIds);
            dGIds = obj.data;
            wR._calculateScores();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate categories object
        dojo.xhrGet({
          url: jsonSeqs,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonSeqs);
            dSeqs = obj.data;
            wR._calculateScores();
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
            wR._calculateScores();
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
            wR._calculateScores();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        // Populate distances object
        dojo.xhrGet({
          url: jsonDist,
          handleAs: "json",
          load: function (obj) {
            /* here, obj will already be a JS object deserialized from the JSON response */
            console.log(jsonDist);
            dDist = obj;
            console.log(dDist['4_108']);
            wR._calculateScores();
          },
          error: function (err) {
            /* this will execute if the response couldn't be converted to a JS object,
               or if the request was unsuccessful altogether. */
          }
        });

        //setup click functionality
        this.map.on('click', selectParcelPiece);

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

        function selectParcelPiece(evt) {
          console.log('selectParcelPiece');

          var query = new Query();
          query.geometry = pointToExtent(wR.map, evt.mapPoint, iPixelSelectionTolerance);
          query.returnGeometry = false;
          query.outFields = ["*"];

          var queryCommunity = new QueryTask(lyrRTPResiliencySegs.url);
          queryCommunity.execute(query, clickCommunity);

          //Segment search results
          function clickCommunity(results) {
            console.log('clickCommunity');

            var resultCount = results.features.length;
            if (resultCount > 0) {
              var _communityCode = results.features[0].attributes['CommCode'];
            }
          }
        }
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

      _calculateScores: function() {
        console.log('_calculateScores');

        if (typeof dGIds !== "undefined"  && typeof dSeqs !== "undefined" && typeof dCats !== "undefined" && typeof dLyrs !== "undefined" && typeof dDist !== "undefined") {

          // loop through all gis_ids
          for (i in dGIds) {
            var _seqs = dSeqs.filter(o => o['i'] == dGIds[i].i);
            // loop through all sequences
            // search for seqs for GIds
            for (s in _seqs) {
              for (c in dCats) {
                var _lyrs = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
                for (l in _lyrs) {
                  var _index = dGIds[i].i + '_' + _seqs[s].s + '_' + _lyrs[l].LayerCode;
                  var _distrec = dDist[_index];
                  if (typeof _distrec !== "undefined") {
                    var _dist = _distrec.d;
                    console.log(_index)
                    console.log(_dist)
                  }
                }
              }
            }
            // loop through all categories

            // loop through all layercodes

          }
        }
      },

      _updateDisplay: function () {
        console.log('_updateDisplay');

        // filter by Community Code and Building Code
        _strFilterExpression = "CommCode IN (" + sCurCommunities + ") AND BC IN (" + curLandUseFilter + ")"

        // add opportunity zone filter
        if (dom.byId('opportunityzones').value == 'Y') {
          _strFilterExpression = _strFilterExpression + " AND OZ=1"
        }
        lyrParcelPieces.setDefinitionExpression(_strFilterExpression);

        // build expression for symbology based on each categories rank
        var _scoreExp = '';
        var _strHig = '';
        var _strMed = '';
        var _strLow = '';

        maxScore_Places = 0.0;
        maxScore_Access = 0.0;
        maxScore_Transp = 0.0;
        maxScore_Necess = 0.0;

        maxPossible = 0.0;

        aCategoryWeights = [];

        for (let i = 0; i < aCategories.length; i++) {
          _value = parseFloat(dom.byId('rank' + aCategories[i]).value);
          _scoreExp += " $feature." + aCategories[i] + " * " + String(_value)

          aCategoryWeights.push(_value);

          switch (aCategories_Groups[i]) {
            case 'places':
              if (_value > maxScore_Places) { // can't add max since these places never overlap
                maxScore_Places = _value;
              }
              break;
            case 'access':
              maxScore_Access += _value;
              break;
            case 'transp':
              maxScore_Transp += _value;
              break;
            case 'necess':
              maxScore_Necess += _value;
              break;
          }

          // for all but last item add plus(+) sign between expressions
          if (i != aCategories.length - 1) {
            _scoreExp += " + ";
          }

          switch (dom.byId('rank' + aCategories[i]).value) {
            case '0.3333':
              _strLow += aCategories_Names[i] + ", ";
              break;
            case '0.6667':
              _strMed += aCategories_Names[i] + ", ";
              break;
            case '1.0000':
              _strHig += aCategories_Names[i] + ", ";
              break;
          }

        }

        maxPossible = maxScore_Places + maxScore_Access + maxScore_Transp + maxScore_Necess;

        if (_strHig.length > 0 && _strMed.length > 0 && _strLow.length > 0) {
          strSelectedPriorities = 'High Priority: ' + _strHig.substring(0, _strHig.length - 2) + " -- " + 'Medium Priority: ' + _strMed.substring(0, _strMed.length - 2) + " -- " + 'Low Priority: ' + _strLow.substring(0, _strLow.length - 2);
        } else if (_strHig.length > 0 && _strMed.length > 0 && _strLow.length == 0) {
          strSelectedPriorities = 'High Priority: ' + _strHig.substring(0, _strHig.length - 2) + " -- " + 'Medium Priority: ' + _strMed.substring(0, _strMed.length - 2);
        } else if (_strHig.length > 0 && _strMed.length == 0 && _strLow.length > 0) {
          strSelectedPriorities = 'High Priority: ' + _strHig.substring(0, _strHig.length - 2) + " -- " + 'Low Priority: ' + _strLow.substring(0, _strLow.length - 2);
        } else if (_strHig.length == 0 && _strMed.length > 0 && _strLow.length > 0) {
          strSelectedPriorities = 'Medium Priority: ' + _strMed.substring(0, _strMed.length - 2) + " -- " + 'Low Priority: ' + _strLow.substring(0, _strLow.length - 2);
        } else if (_strHig.length > 0 && _strMed.length == 0 && _strLow.length == 0) {
          strSelectedPriorities = 'High Priority: ' + _strHig.substring(0, _strHig.length - 2);
        } else if (_strHig.length > 0 && _strMed.length == 0 && _strLow.length == 0) {
          strSelectedPriorities = 'Medium Priority: ' + _strMed.substring(0, _strMed.length - 2);
        } else if (_strHig.length == 0 && _strMed.length == 0 && _strLow.length > 0) {
          strSelectedPriorities = 'Low Priority: ' + _strLow.substring(0, _strLow.length - 2);
        } else {
          strSelectedPriorities = '';
        }

        var vcUVRenderer = new UniqueValueRenderer({
          type: "unique-value",  // autocasts as new UniqueValueRenderer()
          valueExpression: "" +
            "var score = (" + _scoreExp + ')/' + maxPossible + ";" +
            "if      (score>0.80) { return 'class_5'; }" +
            "else if (score>0.60) { return 'class_4'; }" +
            "else if (score>0.40) { return 'class_3'; }" +
            "else if (score>0.20) { return 'class_2'; }" +
            "else                 { return 'class_1'; }",
          uniqueValueInfos: [
            { value: "class_5", label: "Most Accessibility (80-100% of Max Possible)", symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 255, 255]), 5), new Color("#031273")) },
            { value: "class_4", label: "High Accessibility (60-80% of Max Possible)", symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 255, 255]), 5), new Color("#2c7fb8")) },
            { value: "class_3", label: "Middle Accessibility (40-60% of Max Possible)", symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 255, 255]), 5), new Color("#52c7d5")) },
            { value: "class_2", label: "Low Accessibility (20-40% of Max Possible)", symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 255, 255]), 5), new Color("#a1dab4")) },
            { value: "class_1", label: "Least Accessibility (0-20% of Max Possible)", symbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 255, 255]), 5), new Color("#ffffcc")) }
          ]

        });
        lyrParcelPieces.setRenderer(vcUVRenderer);

      },

      //Run when receiving a message
      onReceiveData: function (name, widgetId, data, historyData) {
        //filter out messages
        if (name == 'Location Score') {
          if (data.message == 'remove_location') {
            if (bLocationGraphic) {
              // should only be one graphic in addition to communities at a time (community borders and selection)
              // so remove the last
              wR.map.graphics.remove(wR.map.graphics.graphics[wR.map.graphics.graphics.length - 1]);
              bLocationGraphic = false;
            }
          }
          return;
        }
      },

      _turnoffall: function () {
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

          for (c in dCats) {


            dojo.place("<br/>", "menu");

            bId = "button" + dCats[c].CategoryCode;

            var button3 = new Button({ label:'▶', id:bId, style:"display:inline"});

            button3.startup();
            button3.placeAt(divMenu);
            button3.on("click", this._expand);

            dojo.style(bId,"width","18px");
            dojo.style(bId,"height","16px");
            //dojo.style(bId,"display","inline-block");

            //dojo.style(bId,"background",sBGColor);
            //dojo.style(bId,"color",sFGColor);
            
            // category heading
            dojo.place("<div class = \"grouptitle\" style=\"display:inline\"><p class=\"thicker\" style=\"display:inline\">" + dCats[c].CategoryName + "</div><br/>", "menu");

            divCatName = "cat" + dCats[c].CategoryCode

            var divCat = domConstruct.create("div",{id:divCatName});

            divCat.style.display='none';

            divMenu.appendChild(divCat);

            // layers div
            dojo.place("<div style=\"display: none;\" id=\"div" + dCats[c].CategoryCode +  "\"", divCatName);

            // category weight
            //dojo.place("<span style=\"display: flex; justify-content: flex-end\">Weight:&nbsp;</span>", divCatName);
            
            // weight heading
            dojo.place("<span>&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<small>Weight</small>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<small>Max Out #</small></span>", divCatName);
            dojo.place("<br/>", divCatName);


            dojo.place("<span>&nbsp;&nbsp;<b>Layer</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>", divCatName);


            var selWeight = new Select({
              name: "weight" + dCats[c].CategoryCode,
              options: [
                { label: "10", value: "10", selected: true },
                { label: "9" , value: "9"                  },
                { label: "8" , value: "8"                  },
                { label: "7" , value: "7"                  },
                { label: "6" , value: "6"                  },
                { label: "5" , value: "5"                  },
                { label: "4" , value: "4"                  },
                { label: "3" , value: "3"                  },
                { label: "2" , value: "2"                  },
                { label: "1" , value: "1"                  },
                { label: "0" , value: "0"                  }
              ]
            }).placeAt(divCatName);


            _layers = dLyrs.filter(o => o['CategoryCode'] == dCats[c].CategoryCode);
            _numlayers = _layers.length;
            // layers heading

            //dojo.place("<hr/>, divCatName);

            var selMaxOut = new Select({
              name: "nummax" + dCats[c].CategoryCode
            }).placeAt(divCatName);


            //dojo.place("<hr/>", divCatName)

            for (l in _layers) {
              //dojo.place("<p style=\"display:inline\">&nbsp;&nbsp;</p>", divCatName);
              
              var divToggle = domConstruct.create("div",{id:"toggle" + _layers[l].LayerCode});
  
              divCat.appendChild(divToggle);

              var _checkbox = "<span>&nbsp;&nbsp;&nbsp;&nbsp;<input type=\"checkbox\" id=\"chk" + _layers[l].LayerCode + "\" checked data-dojo-type=\"dijit/form/CheckBox\"> <label for=\"chk" + _layers[l].LayerCode + "\">" + _layers[l].LayerName + "</label></span><br/>";

              dojo.place(_checkbox, divToggle);

//              var checkbox = new CheckBox({
//                name: "checkbox" + _layers[l].LayerCode,
//                label: _layers[l].LayerName,
//                value: "yes",
//                checked: true,
//                onChange: function(newValue){
//                  console.log("Checkbox value: ", newValue);
//                }
//              });
//
//              domConstruct.place(checkbox.domNode, divToggle);
//              checkbox.set("label", "SomeName");
//              
//              var myToggleButton = new ToggleButton({
//                checked: true,
//                iconClass: "dijitCheckBoxIcon",
//                label: _layers[l].LayerName
//              }, divToggle);
//              dojo.place("<br/>", divCatName);
//
//              myToggleButton.domNode.style.color = "green"; // Change the background color to red
//              myToggleButton.domNode.style.border = "0px solid green";
//              //myToggleButton.domNode.style.fontSize = "12px";
//              myToggleButton.domNode.style.borderRadius = "0px";

              selMaxOut.addOption({ value: String(_numlayers - l), label: String(_numlayers - l) }); // add all options at once as an array

              //new Select({
              //  name: "select" + _layers[l].LayerCode,
              //  options: [
              //    { label: "High"   , value: "1.0000", selected: true },
              //    { label: "Medium" , value: "0.6667"                 },
              //    { label: "Low"    , value: "0.3333"                 },
              //    { label: "Exclude", value: "0.0000"                 }
              //  ]
              //}).placeAt(divCatName);
              //dojo.place('<span">&nbsp;' + _layers[l].LayerName + "</span><br/>", divCatName);
            }
            selMaxOut.set("value",Math.min(4,_numlayers))
            selMaxOut.startup();
          }
        }

        //for (var k = 0; k < 2; k++) {
        //  
        //  
        //  for (var l = 0; l < aResultGroup.length; l++) {
        //    if (aGroups[j] == aResultGroup[l] && aCategories[k] == aResultCategories[l]) {
        //        
        //      if (aResultTiers[l] == 1) {
        //        sBGColor="#ED2024";
        //        sFGColor="#FFFFFF";
        //      } else if (aResultTiers[l] == 2) {
        //        sBGColor="#37A949";
        //        sFGColor="#FFFFFF";
        //      } else if (aResultTiers[l] == 3) {
        //        sBGColor="#37C2F1";
        //        sFGColor="#FFFFFF";
        //      } else {
        //        sBGColor="#222222";
        //        sFGColor="#FFFFFF";
        //      }
        //      
        //      var button3 = new Button({ label:aResultRefLabel[l], id:"button_" + aResultRefLabel[l]});
        //      button3.startup();
        //      button3.placeAt(divResults);
        //      button3.on("click", this.ZoomToCorridor);
        //      
        //      dojo.style("button_" + aResultRefLabel[l],"width","40px");
        //      dojo.style("button_" + aResultRefLabel[l],"height","16px");
        //      dojo.style("button_" + aResultRefLabel[l],"background",sBGColor);
        //      dojo.style("button_" + aResultRefLabel[l],"color",sFGColor);
        //      
        //      dojo.place("<div class = \"corridoritem\">&nbsp;&nbsp;" + aResultNames[l] + "</div></br>", "resultssection");
        //      
        //      //dojo.create("div", { id:, innerHTML: "<p>hi</p>" }, "divResults");
        //      
        //      //divResults.innerHTML += "</br>";
        //      
        //    }
        //  }
        //  dojo.place("</br></br></br>", "resultssection");
        //}
      },

      _expand: function() {
        console.log('_expand');

        var myBut = registry.byId("button" + this.id.slice(-2));
        var divCat = dom.byId("cat" + this.id.slice(-2));

        if (divCat.style.display=='none') {
          divCat.style.display='block';
          myBut.set('label','▼');
        } else {
          divCat.style.display='none';
          myBut.set('label','▶');
        }
        
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