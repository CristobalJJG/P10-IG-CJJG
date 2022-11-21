let scene, renderer;
let camera;
let camcontrols;
let objetos = [];
let nodes = [],
    ways = [],
    relations = [];
let minlat, maxlat, minlon, maxlon;
let t0, key;
init();
animationLoop();

function init() {
    document.getElementById("espere").innerHTML = "Por favor, espera a que se cargue el mapa...";
    //Defino cámara
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        20, window.innerWidth / window.innerHeight,
        0.1, 1000
    );
    camera.position.set(0, 0, 60);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //Lectura datos xml
    var loader = new THREE.FileLoader();
    loader.load("../OSM/7-palmas.osm", function(text) {
        //Fuente https://www.w3schools.com/xml/xml_parser.asp
        var text, parser, xmlDoc;
        parser = new DOMParser();
        xmlDoc = parser.parseFromString(text, "text/xml");

        // Recorremos xml
        //Obtiene los límites del mapa
        var x = xmlDoc.getElementsByTagName("bounds");
        minlat = x[0].getAttribute("minlat");
        maxlat = x[0].getAttribute("maxlat");
        minlon = x[0].getAttribute("minlon");
        maxlon = x[0].getAttribute("maxlon");
        //Elementos nodes para cada referencia contienen latitud y longitud
        let nodes = xmlDoc.getElementsByTagName("node");
        //Accede a los elementos ways
        x = xmlDoc.getElementsByTagName("way");
        //Recorro los elementos buscando aquellos que sean highway o building
        for (let i = 0; i < x.length; i++) {
            ways.push(x[i].getAttribute("id"));
            let tags = x[i].getElementsByTagName("tag");
            let interest = 0; //Por defecto no es elemento de interés
            //Recorro tags del elemento way
            for (let j = 0; j < tags.length; j++) {
                if (tags[j].hasAttribute("k")) {
                    //Caminos
                    if (tags[j].getAttribute("k") == "highway") {
                        //Zona peatonal
                        if (tags[j].getAttribute("v") == "pedestrian") {
                            interest = 3;
                            break;
                        }
                        interest = 1;
                        break;
                    }
                    //Edificios
                    if (tags[j].getAttribute("k") == "building") {
                        interest = 2;
                        break;
                    }
                    //Ocio
                    if (tags[j].getAttribute("k") == "leisure") {
                        interest = 4;
                        break;
                    }
                }
            }
            //Si el elemento way es  de interés
            if (interest > 0) {
                const points = [];

                //Recorre los nodos del elemento
                let nds = x[i].getElementsByTagName("nd");
                for (let k = 0; k < nds.length; k++) {
                    let ref = nds[k].getAttribute("ref");

                    //Probablemente hay mejores formas con xmlDoc.querySelector
                    //de momento busco referencia de forma iterativa a mano para obtener coordenaas
                    for (let nd = 0; nd < nodes.length; nd++) {
                        if (nodes[nd].getAttribute("id") == ref) {
                            let lat = Number(nodes[nd].getAttribute("lat"));
                            let lon = Number(nodes[nd].getAttribute("lon"));
                            //longitudes crecen hacia la derecha, como la x
                            let mlon = Mapeo(lon, minlon, maxlon, -5, 5);
                            //Latitudes crecen hacia arriba, como la y
                            let mlat = Mapeo(lat, minlat, maxlat, -5, 5);
                            //Crea esfera del nodo del elemento
                            //Esfera(mlon, mlat, 0, 0.015, 5, 5, 0xffffff);
                            //Añade punto
                            points.push(new THREE.Vector3(mlon, mlat, 0));
                            //Nodo localizado, no sigue recorriendo
                            break;
                        }
                    }
                }

                //Según elemento de interés crea objeto
                switch (interest) {
                    case 1: //highways
                        drawLine(points, "#0000ff");
                        break;
                    case 3: //pedestrian
                        drawLine(points, "#50ff50");
                        break;
                    case 2: //buildings
                        drawBuilding(points, 1);
                        break;
                    case 4: //ocio
                        drawBuilding(points, 0);
                        break;
                }
            }
        }

        y = xmlDoc.getElementsByTagName("node");
        for (let i = 0; i < y.length; i++) {
            if (y[i].getElementsByTagName("tag").length > 0) {
                let points = [];
                let tags = y[i].getElementsByTagName("tag");
                let flag = false;

                let lat = Number(y[i].getAttribute("lat"));
                let lon = Number(y[i].getAttribute("lon"));
                //longitudes crecen hacia la derecha, como la x
                var mlon = Mapeo(lon, minlon, maxlon, -5, 5);
                //Latitudes crecen hacia arriba, como la y
                var mlat = Mapeo(lat, minlat, maxlat, -5, 5);
                //Añade punto
                //points.push(new THREE.Vector3(mlon, mlat, 0));

                if (tags[0].getAttribute("v") == "traffic_signals") {
                    Esfera(mlon, mlat, 0, 0.075, 5, 5, "#ff7722");
                    flag = true;
                } else if (tags[0].getAttribute("k") == "crossing") {
                    Esfera(mlon, mlat, 0, 0.05, 5, 5, "#ffffff");
                    flag = true;
                }
                if (flag) ways.push(y[i].getAttribute("id"));
            }
        }
        console.log("Obtenidos " + ways.length + " elementos");
    });

    //OrbitControls
    camcontrols = new THREE.OrbitControls(camera, renderer.domElement);
    t0 = new Date();
}

//valor, rango origen, rango destino
function Mapeo(val, vmin, vmax, dmin, dmax) {
    //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
    let t = 1 - (vmax - val) / (vmax - vmin);
    return dmin + t * (dmax - dmin);
}

function Esfera(px, py, pz, radio, nx, ny, col) {
    let geometry = new THREE.SphereGeometry(radio, nx, ny);
    let material = new THREE.MeshBasicMaterial({ color: col });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    scene.add(mesh);
    objetos.push(mesh);
}

function drawLine(points, c) {
    hmaterial = new THREE.LineBasicMaterial({ color: c });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    line = new THREE.Line(geometry, hmaterial);
    scene.add(line);
}

function drawBuilding(points, option) {
    shape = new THREE.Shape();
    shape.autoClose = true;
    //Objeto por extrusión
    for (let np = 0; np < points.length; np++) {
        if (np > 0) shape.lineTo(points[np].x, points[np].y);
        else shape.moveTo(points[np].x, points[np].y);
    }


    let bmaterial, max;
    if (option == 0) {
        max = 0.3;
        bmaterial = new THREE.LineBasicMaterial({ color: 0xff5080 });
    } else if (option == 1) {
        n = Math.random() * 0xffff;
        max = 0.1;
        bmaterial = new THREE.LineBasicMaterial({ color: n });
    }

    const extrudeSettings = {
        steps: 1,
        depth: 0.2 + THREE.MathUtils.randFloat(-0.1, max),
        bevelThickness: 0,
        bevelSize: 0,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geometry, bmaterial);
    scene.add(mesh);
}

//Bucle de animación
function animationLoop() {
    requestAnimationFrame(animationLoop);

    //TrackballControls
    let t1 = new Date();
    let secs = (t1 - t0) / 1000;
    camcontrols.update(1 * secs);
    renderer.render(scene, camera);
};