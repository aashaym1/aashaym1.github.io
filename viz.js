// window.onload=drawOpenLayersMap;
let width = document.body.clientWidth * 0.64;
let height = 500;
let file_location = 'data/stations.csv';
let svg_map = d3.select('#stations-over-time-viz').append('svg')
    .attr('width', width)
    .attr('height', height);

let myExtent = [
    -12553481.8104441,
    4866886.776642518,
    -12322948.771123363,
    5097419.815963253
];

let center=ol.proj.fromLonLat([-111.0937, 39.3210]);
let zoom=7.7;

const map = new ol.Map({
    target: 'js-map',
    view: new ol.View({
        center: center,
        zoom: zoom,
    })
});

let projection = d3.geoMercator()
    .scale(1)
    .translate([0, 0]);

let path = d3.geoPath()
    .projection(projection);

let allData = {};
let poiData={};
let tilesData={};
let cityData={};
let dataLoaded = 0;

let cngData = {};
let lngData = {};
let lpgData = {};
let e85Data = {};
let bdData = {};
let elecData = {};
let hyData = {};

let allData_count = {};
let law_data = {};

let key_list = [];

let visibleRange = [1994, 2022];
let visibleStations = [];

let selectedFuelTypes = {
    'cng': false,
    'lng': false,
    'lpg': false,
    'e85': false,
    'bd': false,
    'elec': false,
    'hy': false,
};

let colors = {
    'cng': "#1f77b4",
    'lng': "#ff7f0e",
    'lpg': "#2ca02c",
    'e85': "#d62728",
    'bd': "#9467bd",
    'elec': "#8c564b",
    'hy': "#e377c2",
};

let svg_map_group = svg_map.append('g').attr('id', 'maps');

let stationData = {};

let current_showing_data_name = "USA";
let current_showing_state_postal = "USA";

let mouse_overed_state_full_name;
let mouse_overed_state_postal;
let mouse_overed_state_id;

let mouse_overed_station;

function loadTiles(data){
    tilesData['tile']=data;
    console.log(tilesData['tile'].features.length+"Tile data");
}

function loadPoi(data){
    poiData['poi'] = data;
    console.log(poiData['poi'].length+"kuch aaya ki nahiiiii??");
}

function loadCityData(data) {
    cityData['city'] = data;
    console.log("citydata loaded");
}

function loadData(data, name) {
    data = data.filter((item) => {
        return ['HI', 'AK', 'PR'].includes(item.State) === false;
    });

    data.forEach((d) => {
        let i=0;
        if(d['Status Code']!=='T') {
            d['Open Date'] = d3.timeParse("%m/%d/%Y")(d['Open Date']);
            d['color'] = colors[name];
        }
    });

    let number_per_year = {};
    for (let year = 1994; year <= 2022; ++year) {
        data[year] = data.filter((d) => {
            return d['Open Date'] < new Date(year + 1, 0) &&
                d['Open Date'] > new Date(year - 1, 11, 31, 23);
        });
        number_per_year[year] = {};
        number_per_year[year]['USA'] = data[year].length;
        data[year].forEach((d) => {
            if (number_per_year[year][d.State] === undefined) {
                number_per_year[year][d.State] = 0;
            }
            number_per_year[year][d.State] += 1;
        })
    }

    allData_count[name] = number_per_year;
    allData[name] = data;
    ++dataLoaded;
}

function loadData_law(data){
    let state_law, date_law, target_list_law;
    let result = [];
    data.forEach((data_row)=>{
        state_law = data_row['State'];
        date_law = data_row['Enacted Date'].slice(0,4);
        target_list_law = data_row['Technology Categories'].split('|');

        target_list_law.forEach((fuel_type)=>{
            if(law_data[fuel_type] === undefined){
                law_data[fuel_type] = {};
            }
            if(law_data[fuel_type][date_law]===undefined){
                law_data[fuel_type][date_law] = {'USA':0};
            }
            if(law_data[fuel_type][date_law][state_law] === undefined){
                law_data[fuel_type][date_law][state_law] = 0;
            }
            law_data[fuel_type][date_law][state_law] += 1;
            law_data[fuel_type][date_law]['USA'] += 1;
        })
        law_data['lng'] = {};
        law_data['lng'][date_law] = {'USA':0};
        law_data['lng'][date_law][state_law] = 0;
    })

}

function init() {
    let data = [];
    let data1=[];
    let data2=[];
    for (let year = 1995; year <= 2022; ++year) {
        cngData[year] = allData['cng'][year];
        lngData[year] = allData['lng'][year];
        lpgData[year] = allData['lpg'][year];
        e85Data[year] = allData['e85'][year];
        bdData[year] = allData['bd'][year];
        elecData[year] = allData['elec'][year];
        hyData[year] = allData['hy'][year];
        
        data = data.concat(allData['cng'][year]);
        data = data.concat(allData['lng'][year]);
        data = data.concat(allData['lpg'][year]);
        data = data.concat(allData['e85'][year]);
        data = data.concat(allData['bd'][year]);
        data = data.concat(allData['elec'][year]);
        data = data.concat(allData['hy'][year]);
    }
    data1=poiData['poi'];
    data2=tilesData['tile'];
    svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => projection([d.Longitude, d.Latitude])[0])
        .attr('cy', (d) => projection([d.Longitude, d.Latitude])[1])
        .attr('class',(d) => d.State)
        .attr('r', 3)
        .style('fill', (d) => d.color)
        .style('opacity', 0.0);
}

function setText(text) {
    if (document.getElementById("vis_metric").value === "hours")
    {
        let hour = text;
        hour = +hour;
        hour = hour - 1;
        if (hour < 10)
            document.getElementById("hour_vis").innerHTML = "0" + hour + ":00";
        else document.getElementById("hour_vis").innerHTML = hour + ":00";
    }
}

function hideLoader(){
    document.getElementById("loader").style.visibility='hidden';
}

function drawStations() {
    let milliseconds_start = (new Date()).getTime();
    // document.getElementById("loader").style.visibility='visible';
    let hour=10;
    let metric= document.getElementById("vis_metric").value;
    if(metric==="hours") {
        document.getElementById("poi_hour").max=24;
        document.getElementById("poi_hour").min=1;
        document.getElementById("poi_hour").innerHTML="Hour for Visualization";
        hour = document.getElementById("poi_hour").value;
        hour=+hour;
        hour=hour-1;
        if (hour < 10)
            document.getElementById("hour_vis").innerHTML = "0" + hour + ":00";
        else document.getElementById("hour_vis").innerHTML = hour + ":00";
    }
    if(metric==="visits"){
        document.getElementById("poi_hour").max=30;
        document.getElementById("poi_hour").min=1;
        document.getElementById("poi_hour").innerHTML="Day for Visualization";
        hour = document.getElementById("poi_hour").value;
        hour=+hour;
        hour=hour-1;
        document.getElementById("hour_vis").innerHTML =  hour+1;
    }
    // const elements = document.getElementsByClassName("map");
    // while(elements.length > 0){
    //     elements[0].parentNode.removeChild(elements[0]);
    // }
    // const elem = document.createElement('div');
    // elem.setAttribute("id", "js-map");
    // elem.setAttribute("class", "map");
    // document.getElementById("division").appendChild(elem);
    let startYear = visibleRange[0];
    let endYear = visibleRange[1];

    if (startYear < 1995)
        startYear = 1995;
    if (endYear > 2022)
        endYear = 2022;

    d3.select('#year-label').text(startYear + ' - ' + endYear);

    let data = [];
    let data1=poiData['poi'];
    let data2=cityData['city'];
    let data2Dict ={};
    data2.forEach(function(d){
        data2Dict[d.city] = d;
    });
    let tile_data=tilesData['tile'];
    for (let year = startYear; year <= endYear; ++year) {
        if (selectedFuelTypes['cng'])
            data = data.concat(allData['cng'][year]);

        if (selectedFuelTypes['lng'])
            data = data.concat(allData['lng'][year]);

        if (selectedFuelTypes['lpg'])
            data = data.concat(allData['lpg'][year]);

        if (selectedFuelTypes['e85'])
            data = data.concat(allData['e85'][year]);

        if (selectedFuelTypes['bd'])
            data = data.concat(allData['bd'][year]);

        if (selectedFuelTypes['elec'])
            data = data.concat(allData['elec'][year]);

        if (selectedFuelTypes['hy'])
            data = data.concat(allData['hy'][year]);
    }

    if (current_showing_data_name !== "USA") {
        data = data.filter((station) => {
            return current_showing_state_postal === station.State;
        })
    }
    let shp_start = (new Date()).getTime();
    console.table(data)
    let shp_features=tile_data;
    console.table(shp_features);
    let shpSource = new ol.source.Vector({
        url:'data/utah_shapefile.geojson',
        format: new ol.format.GeoJSON()
    });
    let shpLayer = new ol.layer.Vector({
        source: shpSource
    });
    let shp_end = (new Date()).getTime();
    console.log("Time taken to add Shape Layer points to array was: "+(shp_end-shp_start)/1000+" seconds");

    let poi_start = (new Date()).getTime();
    //creating feature layers
    let features_arr = [];
    let rows=20;
    for (let i=0;i<rows;i++) {
        features_arr[i] = [];
    }
    let maximum_visits=0;
    for(thing=0;thing<data1.length;thing++){
        if(metric==="visits")
            hourwise_string=data1[thing]['visits_by_day'].substring(1,data1[thing]['visits_by_day'].length-1);
        if(metric==="hours")
            hourwise_string=data1[thing]['popularity_by_hour'].substring(1,data1[thing]['popularity_by_hour'].length-1);
        const hourwise_array = hourwise_string.split(",");
        if(maximum_visits<(+hourwise_array[hour]))
            maximum_visits=hourwise_array[hour];
    }
    const poi_features=[];
    const lpg_features = [];
    const elec_features = [];
    const hy_features = [];
    const bd_features = [];
    const e85_features = [];
    const lng_features = [];
    const cng_features = [];
    svg_map.selectAll('circle').data(data1).enter().append('circle').attr('class',function(d){
        let pf=new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([d.longitude, d.latitude])),
            name: d.location_name_x,
            category: d.top_category,
            city: ""+d.city_x,
        })
        // pf.setStyle(
        //     new ol.style.Style({
        //     image: new ol.style.Circle({
        //         radius: (+d.popularity_by_hour[hour-1])/4,
        //         fill: new ol.style.Fill({color: '#000'})
        //     })
        // })
        // )
        //code to be copied start
        if(metric==="hours")
        hourwise_string=d.popularity_by_hour.substring(1,d.popularity_by_hour.length-1);
        if(metric==="visits")
            hourwise_string=d.visits_by_day.substring(1,d.visits_by_day.length-1);
        const hourwise_array = hourwise_string.split(",");

        try{features_arr[Math.floor(hourwise_array[hour]*(rows-1)/(maximum_visits))].push(pf);}
        catch(err){
            console.log(Math.floor(hourwise_array[hour]*(rows-1)/(maximum_visits)));
        }
        // pf.setStyle(
        //     new ol.style.Style({
        //         image: new ol.style.RegularShape({
        //             radius: Math.pow((+hourwise_array[hour]+1),1/3),
        //             points:3,
        //             angle: 0,
        //             stroke:new ol.style.Stroke({color: '#000'}),
        //             fill: new ol.style.Fill({color: '#FFF'})
        //         })
        //     })
        // )
        //code to be copied end
        //
        // poi_features.push(pf);
        return 'circle';
    })
    if(poi_features.length===0) {
        console.log("aagaye yeh power rangersss");
        let thing=0;
            for(thing=0;thing<data1.length;thing++){
            let pf=new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([data1[thing]['longitude'], data1[thing]['latitude']])),
                name: data1[thing]['location_name_x'],
                category: data1[thing]['top_category'],
                city: ""+data1[thing]['city_x'],
            })
            // pf.setStyle(
            //     new ol.style.Style({
            //     image: new ol.style.Circle({
            //         radius: (+d.popularity_by_hour[hour-1])/4,
            //         fill: new ol.style.Fill({color: '#000'})
            //     })
            // })
            // )
                if(metric==="visits")
            hourwise_string=data1[thing]['visits_by_day'].substring(1,data1[thing]['visits_by_day'].length-1);
                if(metric==="hours")
                    hourwise_string=data1[thing]['popularity_by_hour'].substring(1,data1[thing]['popularity_by_hour'].length-1);
            const hourwise_array = hourwise_string.split(",");
                try{features_arr[Math.floor(hourwise_array[hour]*(rows-1)/(maximum_visits))].push(pf);}
                catch(err){
                    console.log(Math.floor(hourwise_array[hour]*(rows-1)/(maximum_visits)));
                }
            // pf.setStyle(
            //     new ol.style.Style({
            //         image: new ol.style.RegularShape({
            //             radius: Math.pow((+hourwise_array[hour]+1),1/3),
            //             points:3,
            //             angle: 0,
            //             stroke:new ol.style.Stroke({color: '#000'}),
            //             fill: new ol.style.Fill({color: '#FFF'})
            //         })
            //     })
            // )
                //code to be copied end
            poi_features.push(pf);
    }}
    let poi_end = (new Date()).getTime();
    console.log("Time taken to add POI points to array was: "+(poi_end-poi_start)/1000+" seconds");
    let circ_start = (new Date()).getTime();
    svg_map.selectAll('circle').remove();
    let circ_end = (new Date()).getTime();
    console.log("circle removal time is "+(circ_end-circ_start)/1000);
    let Station_start = (new Date()).getTime();
    svg_map.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => projection([d.Longitude, d.Latitude])[0])
        .attr('cy', (d) => projection([d.Longitude, d.Latitude])[1])
        .attr('class', function(d){
            if(d.color==="#1f77b4") {
                cng_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#ff7f0e") {
                lng_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#2ca02c") {
                lpg_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#d62728") {
                e85_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#9467bd") {
                bd_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#8c564b") {
                elec_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#e377c2") {
                hy_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            return d.state;
        })
        .attr('r', () => {
            if (data.length < 8)
                return 6;
            else if (data.length < 15)
                return 5;
            else if (data.length < 25)
                return 4;
            else
                return 3;
        })
        .attr("pointer-events", ()=>{
            if(current_showing_data_name === "USA"){
                return "none";
            }
            return "all";
        })
        .style('fill', (d) => d.color)
        .style('opacity', 0.4)
        .on('mouseover', function (e, d) {
            if (current_showing_data_name !== "USA") {
                mouse_overed_station = d;
                pop_up_display(true);
            }

        })
        .on('mouseout', () => {
            pop_up_display(false);
        })
    let Station_end = (new Date()).getTime();
    console.log("time for adding stations data to array was: "+(Station_end-Station_start)/1000+" seconds");

    let VectorSourcePoiGrouped=[];
    for (let i=0;i<rows;i++){
       VectorSourcePoiGrouped.push(
           new ol.source.Vector({
               features:features_arr[i]
           })
       )
    }
    const vectorSourcePoi = new ol.source.Vector({
        features:poi_features
    });
    const vectorSourceCng = new ol.source.Vector({
        features:cng_features
    });
    const vectorSourceLng = new ol.source.Vector({
        features:lng_features
    });
    const vectorSourceLpg = new ol.source.Vector({
        features:lpg_features
    });
    const vectorSourceBd = new ol.source.Vector({
        features:bd_features
    });
    const vectorSourceElec = new ol.source.Vector({
        features:elec_features
    });
    const vectorSourceHy = new ol.source.Vector({
        features:hy_features
    });
    const vectorSourceE85 = new ol.source.Vector({
        features:e85_features
    });
    const vectorLayerPoi = new ol.layer.Vector({
        source: vectorSourcePoi
    });
    let VectorLayerPoiGrouped=[];
    for(let i=0;i<rows;i++){
        VectorLayerPoiGrouped.push(new ol.layer.Vector({
            source: VectorSourcePoiGrouped[i],
            style: new ol.style.Style({
                image: new ol.style.RegularShape({
                    radius: Math.pow(maximum_visits/(20-i),1/3),
                    points:3,
                    angle: 0,
                    stroke:new ol.style.Stroke({color: '#000'}),
                    fill: new ol.style.Fill({color: '#FFF'})
                })
            })
        }))
    }
    const vectorLayerCng = new ol.layer.Vector({
        source: vectorSourceCng,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#1f77b4'})
            })
        })
    });
    const vectorLayerLng = new ol.layer.Vector({
        source: vectorSourceLng,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#ff7f0e'})
            })
        })
    });
    const vectorLayerHy = new ol.layer.Vector({
        source: vectorSourceHy,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#e377c2'})
            })
        })
    });
    const vectorLayerBd = new ol.layer.Vector({
        source: vectorSourceBd,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#9467bd'})
            })
        })
    });
    const vectorLayerE85 = new ol.layer.Vector({
        source: vectorSourceE85,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#d62728'})
            })
        })
    });
    const vectorLayerLpg = new ol.layer.Vector({
        source: vectorSourceLpg,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#2ca02c'})
            })
        })
    });
    const vectorLayerElec = new ol.layer.Vector({
        source: vectorSourceElec,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#8c564b'})
            })
        })
    });
    const layers=[
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ];
    layers.push(shpLayer);
    for(let i=0;i<rows;i++){
        layers.push(VectorLayerPoiGrouped[i]);
    }
    if (selectedFuelTypes['cng']){
        layers.push(vectorLayerCng)
    }
    if (selectedFuelTypes['lng']){
        layers.push(
            vectorLayerLng)
    }
    if (selectedFuelTypes['lpg']){
        layers.push(
            vectorLayerLpg)
    }
    if (selectedFuelTypes['hy']){
        layers.push(
            vectorLayerHy)
    }
    if (selectedFuelTypes['bd']){
        layers.push(
            vectorLayerBd)
    }
    if (selectedFuelTypes['elec']){
        layers.push(
            vectorLayerElec)
    }
    if (selectedFuelTypes['e85']){
        layers.push(
            vectorLayerE85)
    }
    const layerGroup= new ol.layer.Group({
            layers:layers
    })
    // const map = new ol.Map({
    //     target: 'js-map',
    //     view: new ol.View({
    //         center: center,
    //         zoom: zoom,
    //     })
    // });
    map.setLayerGroup(layerGroup);
    max_data = 0;
    Object.keys(selectedFuelTypes).forEach((keys, i) => {
        if (selectedFuelTypes[keys]) {
            const year_list = Object.keys(allData_count[keys]);

            for (let i_year = 0; i_year < year_list.length; i_year++) {
                if (max_data < allData_count[keys][year_list[i_year]][current_showing_state_postal]) {
                    max_data = allData_count[keys][year_list[i_year]][current_showing_state_postal];
                }
            }
        }
    })
    key_list = [];
        Object.keys(selectedFuelTypes).forEach((keys, i) => {
            if (selectedFuelTypes[keys]) {
                linearChart(allData_count[keys], keys, current_showing_state_postal, colors[keys],svg_time_slider);
                key_list.push(keys);
            }
        })
    let feature_onClick;
    map.on('click', function(evt) {
        console.log(evt.pointerEvent.clientX);
        feature_onClick = map.forEachFeatureAtPixel(evt.pixel, function (feature, vectorLayerPoi) {
            console.log(map.getView().getCenter());
            myExtent = map.getView().calculateExtent(map.getSize());
            zoom=map.getView().getZoom();
            center=map.getView().getCenter();
            let popup = document.getElementById("myPopup");
            let mainPopup = document.getElementById("popup");
            popup.classList.toggle("show");
            console.log(data2Dict[feature.values_.city]['population']+feature.values_.city);
            console.log(evt.pixel_);
            let to_be_added="";
            $('input:checkbox').each(function () {
                if ($(this)[0].id === "population")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nPop: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "race")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nRace: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "age")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nAge: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "sex")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nSex: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "poverty")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nPvr: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "cancer")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nCancer Risk: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "food")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nFood Desert: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "unemployment")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nUnemployment: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "income")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nIncome: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "homeless")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nHomeless pct: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "housing")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nHousing Burden: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
            })
            popup.innerHTML="Place Name: "+feature.values_.name+"\n"+to_be_added;
            mainPopup.style.left=evt.pointerEvent.clientX-10+'px';
            mainPopup.style.top=evt.pointerEvent.clientY+'px';
            document.getElementById("Place_id").innerHTML=feature.values_.name;
            document.getElementById("metric_value").innerHTML=Math.pow(feature.style_.image_.radius_,3);
            return feature;
        });
    });
    // draw_bar_chart();
    // chnage_accumulate_year();
    let milliseconds_end = (new Date()).getTime();
    console.log("time taken was "+(milliseconds_end-milliseconds_start)/1000+" seconds!");
}


function drawOpenLayersMap()  {
    const map=new ol.Map({
        view: new ol.View({
            center:[
                -11719546.459002854,
                10409068.786668476
            ],
            zoom: 3
        }),
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        target: "js-map"
    })
    map.on('click',function (e){
        console.log(e);
  })
    const features = [];

}

// https://github.com/deldersveld/topojson/tree/master/countries/us-states
function drawMap() {
    // let mapData = topojson.feature(showing_map_data, showing_map_data.objects[Object.keys(showing_map_data.objects)[0]]);
    projection = d3.geoMercator().scale(1).translate([0, 0]);
    let path = d3.geoPath().projection(projection);
    let bounds = path.bounds(showing_map_data);
    let scale = .95 / Math.max((bounds[1][0] - bounds[0][0]) / width,
        (bounds[1][1] - bounds[0][1]) / height);
    let translation = [(width - scale * (bounds[1][0] + bounds[0][0])) / 2,
        (height - scale * (bounds[1][1] + bounds[0][1])) / 2];

    // Update the projection to use computed scale and translation.
    projection
        .scale(scale)
        .translate(translation);

    svg_map_group
        .selectAll('.map_part')
        .data(showing_map_data.features)
        .join(
            function (enter) {
                return enter
                    .append('path')
                    .attr('d', path)

            }, function (update) {
                return update
            }, function (exit) {
                return exit.remove();
            }
        )
        .attr('class', 'map_part')
        .attr('d', path)
        .style('fill', 'white')
        .style('stroke',  (d) => {
            if(mouse_overed_state_on_bar === d.properties.iso_3166_2){
                return "red";
            }
            return "black";
        })
        .style('stroke-width', (d)=>{
            if(mouse_overed_state_on_bar === d.properties.iso_3166_2){
                return 5;
            }
            return 1;
        })
        .on('mouseover', function (e, d) {
            if (current_showing_data_name === "USA") {
                mouse_overed_state_full_name = d.properties.name;
                mouse_overed_state_postal = d.properties.iso_3166_2;
                mouse_overed_state_id = name_to_code_dict[stateNameProcessing(mouse_overed_state_full_name)];
                pop_up_display(true);
                drawStateHighlight();

            }

        })
        .on('mouseout', () => {
            pop_up_display(false);
            svg_bar_chart.selectAll("#high_light_rect").remove();

        })
        .on('click', (e, d) => {

            if (current_showing_data_name === "USA") {
                mouse_overed_state_full_name = d.properties.name;
                current_showing_state_postal = d.properties.iso_3166_2;
                mouse_overed_state_id = name_to_code_dict[stateNameProcessing(mouse_overed_state_full_name)];

                document.getElementById("main_title_h2").innerHTML = "Alternative Fuel Stations Construction in the " + mouse_overed_state_full_name;
                document.getElementById("construction_h3").innerHTML = "Yearly construction for the " + mouse_overed_state_full_name;
                document.getElementById("policy_h3").innerHTML = "New Policy for the " + mouse_overed_state_full_name;

                svg_map.selectAll('circle').remove()
                current_showing_data_name = mouse_overed_state_full_name;
                getMapData(mouse_overed_state_id).then(() => {
                    drawMap();
                    drawStations();
                });

            }
        });

}
function init_for_map(){
    let hour=10;
    let metric= document.getElementById("vis_metric").value;
    if(metric==="hours") {
        document.getElementById("poi_hour").max=24;
        document.getElementById("poi_hour").min=1;
        document.getElementById("poi_hour").innerHTML="Hour for Visualization";
        hour = document.getElementById("poi_hour").value;
        hour=+hour;
        hour=hour-1;
        if (hour < 10)
            document.getElementById("hour_vis").innerHTML = "0" + hour + ":00";
        else document.getElementById("hour_vis").innerHTML = hour + ":00";
    }
    if(metric==="visits"){
        document.getElementById("poi_hour").max=30;
        document.getElementById("poi_hour").min=1;
        document.getElementById("poi_hour").innerHTML="Day for Visualization";
        hour = document.getElementById("poi_hour").value;
        hour=+hour;
        hour=hour-1;
        document.getElementById("hour_vis").innerHTML =  hour+1;
    }
    let startYear = visibleRange[0];
    let endYear = visibleRange[1];

    if (startYear < 1995)
        startYear = 1995;
    if (endYear > 2022)
        endYear = 2022;

    d3.select('#year-label').text(startYear + ' - ' + endYear);

    let data = [];
    let data1=poiData['poi'];
    let data2=cityData['city'];
    let data2Dict ={};
    data2.forEach(function(d){
        data2Dict[d.city] = d;
    });
    for (let year = startYear; year <= endYear; ++year) {
        if (selectedFuelTypes['cng'])
            data = data.concat(allData['cng'][year]);

        if (selectedFuelTypes['lng'])
            data = data.concat(allData['lng'][year]);

        if (selectedFuelTypes['lpg'])
            data = data.concat(allData['lpg'][year]);

        if (selectedFuelTypes['e85'])
            data = data.concat(allData['e85'][year]);

        if (selectedFuelTypes['bd'])
            data = data.concat(allData['bd'][year]);

        if (selectedFuelTypes['elec'])
            data = data.concat(allData['elec'][year]);

        if (selectedFuelTypes['hy'])
            data = data.concat(allData['hy'][year]);
    }

    if (current_showing_data_name !== "USA") {
        data = data.filter((station) => {
            return current_showing_state_postal === station.State;
        })
    }
    let features_start = (new Date()).getTime();
    const features = [];
    const poi_features=[];
    const lpg_features = [];
    const elec_features = [];
    const hy_features = [];
    const bd_features = [];
    const e85_features = [];
    const lng_features = [];
    const cng_features = [];
    svg_map.selectAll('circle').data(data1).enter().append('circle').attr('class',function(d){
        let pf=new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([d.longitude, d.latitude])),
            name: d.location_name_x,
            category: d.top_category,
            city: ""+d.city_x,
        })
        // pf.setStyle(
        //     new ol.style.Style({
        //     image: new ol.style.Circle({
        //         radius: (+d.popularity_by_hour[hour-1])/4,
        //         fill: new ol.style.Fill({color: '#000'})
        //     })
        // })
        // )
        if(metric==="hours")
            hourwise_string=d.popularity_by_hour.substring(1,d.popularity_by_hour.length-1);
        if(metric==="visits")
            hourwise_string=d.visits_by_day.substring(1,d.visits_by_day.length-1);
        const hourwise_array = hourwise_string.split(",");
        // pf.setStyle(
        //     new ol.style.Style({
        //         image: new ol.style.RegularShape({
        //             radius: Math.pow((+hourwise_array[hour]+1),1/3),
        //             points:3,
        //             angle: 0,
        //             stroke:new ol.style.Stroke({color: '#000'}),
        //             fill: new ol.style.Fill({color: '#FFF'})
        //         })
        //     })
        // )
        poi_features.push(pf);
        return 'circle';
    })
    if(poi_features.length===0) {
        console.log("aagaye yeh power rangersss");
        let thing=0;
        for(thing=0;thing<data1.length;thing++){
            let pf=new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([data1[thing]['longitude'], data1[thing]['latitude']])),
                name: data1[thing]['location_name_x'],
                category: data1[thing]['top_category'],
                city: ""+data1[thing]['city_x'],
            })
            // pf.setStyle(
            //     new ol.style.Style({
            //     image: new ol.style.Circle({
            //         radius: (+d.popularity_by_hour[hour-1])/4,
            //         fill: new ol.style.Fill({color: '#000'})
            //     })
            // })
            // )
            if(metric==="visits")
                hourwise_string=data1[thing]['visits_by_day'].substring(1,data1[thing]['visits_by_day'].length-1);
            if(metric==="hours")
                hourwise_string=data1[thing]['popularity_by_hour'].substring(1,data1[thing]['popularity_by_hour'].length-1);
            const hourwise_array = hourwise_string.split(",");
            // pf.setStyle(
            //     new ol.style.Style({
            //         image: new ol.style.RegularShape({
            //             radius: Math.pow((+hourwise_array[hour]+1),1/3),
            //             points:3,
            //             angle: 0,
            //             stroke:new ol.style.Stroke({color: '#000'}),
            //             fill: new ol.style.Fill({color: '#FFF'})
            //         })
            //     })
            // )
            poi_features.push(pf);
        }}
    let features_end = (new Date()).getTime();
    console.log("adding POI features to array time was "+(features_end-features_start)/1000+" seconds");
    let circ_start = (new Date()).getTime();
    svg_map.selectAll('circle').remove();
    let circ_end = (new Date()).getTime();
    console.log("circle removal time is "+(circ_end-circ_start)/1000);
    let Station_start = (new Date()).getTime();
    svg_map.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d) => projection([d.Longitude, d.Latitude])[0])
        .attr('cy', (d) => projection([d.Longitude, d.Latitude])[1])
        .attr('class', function(d){
            if(d.color==="#1f77b4") {
                cng_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#ff7f0e") {
                lng_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#2ca02c") {
                lpg_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#d62728") {
                e85_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#9467bd") {
                bd_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#8c564b") {
                elec_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            if(d.color==="#e377c2") {
                hy_features.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([d.Longitude, d.Latitude])),
                    name:d['Station Name'],
                    city: d['City'],
                    size: 10
                }))
            }
            return d.state;
        })
        .attr('r', () => {
            if (data.length < 8)
                return 6;
            else if (data.length < 15)
                return 5;
            else if (data.length < 25)
                return 4;
            else
                return 3;
        })
        .attr("pointer-events", ()=>{
            if(current_showing_data_name === "USA"){
                return "none";
            }
            return "all";
        })
        .style('fill', (d) => d.color)
        .style('opacity', 0.4)
        .on('mouseover', function (e, d) {
            if (current_showing_data_name !== "USA") {
                mouse_overed_station = d;
                pop_up_display(true);
            }

        })
        .on('mouseout', () => {
            pop_up_display(false);
        })
    let Station_end = (new Date()).getTime();
    console.log("time for adding stations data to array was: "+(Station_end-Station_start)/1000+" seconds");
    const vectorSourcePoi = new ol.source.Vector({
        features:poi_features
    });
    const vectorSourceCng = new ol.source.Vector({
        features:cng_features
    });
    const vectorSourceLng = new ol.source.Vector({
        features:lng_features
    });
    const vectorSourceLpg = new ol.source.Vector({
        features:lpg_features
    });
    const vectorSourceBd = new ol.source.Vector({
        features:bd_features
    });
    const vectorSourceElec = new ol.source.Vector({
        features:elec_features
    });
    const vectorSourceHy = new ol.source.Vector({
        features:hy_features
    });
    const vectorSourceE85 = new ol.source.Vector({
        features:e85_features
    });
    const vectorLayerPoi = new ol.layer.Vector({
        source: vectorSourcePoi
    });
    const vectorLayerCng = new ol.layer.Vector({
        source: vectorSourceCng,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#1f77b4'})
            })
        })
    });
    const vectorLayerLng = new ol.layer.Vector({
        source: vectorSourceLng,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#ff7f0e'})
            })
        })
    });
    const vectorLayerHy = new ol.layer.Vector({
        source: vectorSourceHy,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#e377c2'})
            })
        })
    });
    const vectorLayerBd = new ol.layer.Vector({
        source: vectorSourceBd,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#9467bd'})
            })
        })
    });
    const vectorLayerE85 = new ol.layer.Vector({
        source: vectorSourceE85,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#d62728'})
            })
        })
    });
    const vectorLayerLpg = new ol.layer.Vector({
        source: vectorSourceLpg,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#2ca02c'})
            })
        })
    });
    const vectorLayerElec = new ol.layer.Vector({
        source: vectorSourceElec,
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 3,
                fill: new ol.style.Fill({color: '#8c564b'})
            })
        })
    });
    const layers=[
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ];
    // layers.push(vectorLayerPoi);
    if (selectedFuelTypes['cng']){
        layers.push(vectorLayerCng)
    }
    if (selectedFuelTypes['lng']){
        layers.push(
            vectorLayerLng)
    }
    if (selectedFuelTypes['lpg']){
        layers.push(
            vectorLayerLpg)
    }
    if (selectedFuelTypes['hy']){
        layers.push(
            vectorLayerHy)
    }
    if (selectedFuelTypes['bd']){
        layers.push(
            vectorLayerBd)
    }
    if (selectedFuelTypes['elec']){
        layers.push(
            vectorLayerElec)
    }
    if (selectedFuelTypes['e85']){
        layers.push(
            vectorLayerE85)
    }
    const layerGroup= new ol.layer.Group({
            layers:layers
        }
    )
    map.setLayerGroup(layerGroup);
    map.
    max_data = 0;
    Object.keys(selectedFuelTypes).forEach((keys, i) => {
        if (selectedFuelTypes[keys]) {
            const year_list = Object.keys(allData_count[keys]);

            for (let i_year = 0; i_year < year_list.length; i_year++) {
                if (max_data < allData_count[keys][year_list[i_year]][current_showing_state_postal]) {
                    max_data = allData_count[keys][year_list[i_year]][current_showing_state_postal];
                }
            }
        }
    })
    key_list = [];
    Object.keys(selectedFuelTypes).forEach((keys, i) => {
        if (selectedFuelTypes[keys]) {
            linearChart(allData_count[keys], keys, current_showing_state_postal, colors[keys],svg_time_slider);
            key_list.push(keys);
        }
    })
    let feature_onClick;
    map.on('click', function(evt) {
        console.log(evt.pointerEvent.clientX);
        feature_onClick = map.forEachFeatureAtPixel(evt.pixel, function (feature, vectorLayerPoi) {
            console.log(map.getView().getCenter());
            myExtent = map.getView().calculateExtent(map.getSize());
            zoom=map.getView().getZoom();
            center=map.getView().getCenter();
            let popup = document.getElementById("myPopup");
            let mainPopup = document.getElementById("popup");
            popup.classList.toggle("show");
            console.log(data2Dict[feature.values_.city]['population']+feature.values_.city);
            console.log(evt.pixel_);
            let to_be_added="";
            $('input:checkbox').each(function () {
                if ($(this)[0].id === "population")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nPop: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "race")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nRace: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "age")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nAge: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "sex")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nSex: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "poverty")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nPvr: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "cancer")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nCancer Risk: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "food")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nFood Desert: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "unemployment")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nUnemployment: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "income")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nIncome: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "homeless")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nHomeless pct: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
                if ($(this)[0].id === "housing")
                {
                    {
                        if($(this).is(':checked'))
                            to_be_added=to_be_added+"\nHousing Burden: "+data2Dict[feature.values_.city][$(this).val()]+"\n";
                    }
                }
            })
            popup.innerHTML="Place Name: "+feature.values_.name+"\n"+to_be_added;
            mainPopup.style.left=evt.pointerEvent.clientX-10+'px';
            mainPopup.style.top=evt.pointerEvent.clientY+590+'px';
            document.getElementById("Place_id").innerHTML=feature.values_.name;
            document.getElementById("metric_value").innerHTML=Math.pow(feature.style_.image_.radius_,3);
            return feature;
        });
    });
    // draw_bar_chart();
    // chnage_accumulate_year();
}
function init() {
    document.getElementById("poi_hour").defaultValue = "10";
    getMapData("USA").then(() => {
            current_showing_data_name = "USA";
            current_showing_state_postal = "USA";
            //drawMap();
           // init_for_map();
            drawStations();
            document.getElementById("main_title_h2").innerHTML = "Alternative Fuel Stations Construction in the U.S.";
        document.getElementById("construction_h3").innerHTML = "Yearly construction for the U.S.";
        document.getElementById("policy_h3").innerHTML = "New Policy for the U.S.";

        }
    );
    myExtent = [
        -12553481.8104441,
        4866886.776642518,
        -12322948.771123363,
        5097419.815963253
    ];
}

d3.json('data/utah_shapefile.geojson').then( (data) => {
    loadTiles(data);
})

d3.csv('data/full_csv.csv').then( (data) => {
     loadPoi(data);
})

d3.csv('data/Utah_city_stats.csv').then( (data) => {
     loadCityData(data);
});

d3.csv('data/cng_Utah.csv').then((data) => {
    loadData(data, 'cng');
});

d3.csv('data/lng_Utah.csv').then((data) => {
    loadData(data, 'lng');
});

d3.csv('data/lpg_Utah.csv').then((data) => {
    loadData(data, 'lpg');
});

d3.csv('data/e85_Utah.csv').then((data) => {
    loadData(data, 'e85');
});

d3.csv('data/elec_Utah.csv').then((data) => {
    loadData(data, 'elec');
});

d3.csv('data/bd_Utah.csv').then((data) => {
    loadData(data, 'bd');
});

d3.csv('data/hy_Utah.csv').then((data) => {
    loadData(data, 'hy');
});

d3.csv('data/laws.csv').then((data)=>{
    loadData_law(data);
})

init();

$(document).ready(function () {
    //colors from the seaborn tab10 color pallette

    document.getElementById('cng_label').style.background = colors['cng'];
    document.getElementById('lng_label').style.background = colors['lng'];
    document.getElementById('lpg_label').style.background = colors['lpg'];
    document.getElementById('e85_label').style.background = colors['e85'];
    document.getElementById('bd_label').style.background = colors['bd'];
    document.getElementById('elec_label').style.background = colors['elec'];
    document.getElementById('hy_label').style.background = colors['hy'];
    // document.getElementById('time-control-slider').addEventListener('slider', (event) => {
    //     visibleRange = [event.detail[0], event.detail[1]];
    //     drawStations();
    // });

    $(document).on('change', 'input[class="fuel_type"]', function () {
        //svg_time_slider.selectAll('line').remove();
        svg_time_slider.selectAll('.lineChartLine').remove();
        svg_law_linear_graph.selectAll('.lineChartLine').remove();
        // svg_time_slider.selectAll("#xTicks_minor_slider").remove();

        $('input:checkbox').each(function () {
            if($(this)[0].id === "cng"
                || $(this)[0].id === "lng"
                || $(this)[0].id === "lpg"
                || $(this)[0].id === "e85"
                || $(this)[0].id === "bd"
                || $(this)[0].id === "elec"
                || $(this)[0].id === "hy"
            ){
                selectedFuelTypes[$(this).val()] = $(this).is(':checked');

            }
        });
        drawStations();
        draw_bar_chart();
    });
});
