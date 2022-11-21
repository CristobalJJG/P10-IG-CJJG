let scene, renderer, camera;
let mapa, mapsx, mapsy;

//Latitud y longitud de los extremos del mapa de la imagen
let minlon = -15.5304,
    maxlon = -15.3656;
let minlat = 28.0705,
    maxlat = 28.1817;
let txwidth, txheight;
let psx, psy;
let paradas = [];
let objetos = [];
let lats = [],
    longs = [],
    nest;

var loader = new THREE.FileLoader();
let map = new Map(),
    de_a = [];

colores = [
    "",
    "#78281F", //1
    "#4A235A", //2
    "#1B4F72", //3
    "#0E6251", //4
    "#186A3B", //5
    "#784212", //6
    "#1B2631", //7
    "#F39C12", //8
    "#16A085", //9
    "#3498DB", //10
    "#A569BD", //11 
    "#5DADE2", //12
]

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    //Posición de la cámara
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camcontrols1 = new THREE.OrbitControls(camera, renderer.domElement);

    //Objeto
    mapsx = 5;
    mapsy = 5;
    Plano(0, 0, 0, mapsx, mapsy);

    Promise.all([getStations(), getPoints()])
        .then((data) => {
            console.log(data);
        });

    //Textura del mapa
    const tx1 = new THREE.TextureLoader().load(
        "https://cdn.glitch.global/8b114fdc-500a-4e05-b3c5-a4afa5246b07/mapaLPGC.png?v=1664882635379",

        // Acciones a realizar tras la carga
        function(texture) {
            //dimensiones
            console.log(texture.image.width, texture.image.height);

            mapa.material.map = texture;
            mapa.material.needsUpdate = true;

            txwidth = texture.image.width;
            txheight = texture.image.height;

            //Adapta dimensiones del plano a la textura
            if (txheight > txwidth) {
                let factor = txheight / (maxlon - minlon);
                mapa.scale.set(1, factor, 1);
                mapsy *= factor;
            } else {
                let factor = txwidth / txheight;
                mapa.scale.set(factor, 1, 1);
                mapsx *= factor;
            }
        }
    );
}

//valor, rango origen, rango destino
function Mapeo(val, vmin, vmax, dmin, dmax) {
    //Normaliza valor en el rango de partida, t=0 en vmin, t=1 en vmax
    let t = 1 - (vmax - val) / (vmax - vmin);
    return dmin + t * (dmax - dmin);
}

function Esfera(px, py, pz, radio, nx, ny, col) {
    let geometry = new THREE.SphereGeometry(radio, nx, ny);
    let material = new THREE.MeshBasicMaterial({
        color: col,
    });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    objetos.push(mesh);
    scene.add(mesh);
}

function Plano(px, py, pz, sx, sy) {
    let geometry = new THREE.PlaneGeometry(sx, sy);

    let material = new THREE.MeshBasicMaterial({});

    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    scene.add(mesh);
    mapa = mesh;
}

function Linea(points, col) {
    hmaterial = new THREE.LineBasicMaterial({ color: col });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    line = new THREE.Line(geometry, hmaterial);
    scene.add(line);
}

function getStations() {
    return new Promise((resolve, reject) => {
        loader.load("./Geolocalización estaciones sitycleta.csv", function(text) {
            //console.log(text);
            let lines = text.split("\n");
            //Cargo archivo con información mde estaciones
            nest = 0;
            for (let line of lines) {
                //No trata primera línea al ser la cabecera
                if (nest > 0) {
                    //console.log(line);
                    //Separo por comas
                    let values = line.split(",");
                    //console.log(values);
                    //Almaceno nomrbes de paradas en array
                    paradas.push(values[1].substring(2, values[1].length - 2));
                    //ALmacena localización estaciones
                    lats.push(Number(values[6].substring(2, values[6].length - 2)));
                    longs.push(Number(values[7].substring(2, values[7].length - 2)));

                    map.set(paradas[nest - 1], [lats[nest - 1], longs[nest - 1]]);
                }
                nest += 1;
            }

            //Objeto para cada estación
            paradas.forEach((item, index, arr) => {
                //longitudes crecen hacia la derecha, como la x
                let mlon = Mapeo(longs[index], minlon, maxlon, -mapsx / 2, mapsx / 2);
                //Latitudes crecen hacia arriba, como la y
                let mlat = Mapeo(lats[index], minlat, maxlat, -mapsy / 2, mapsy / 2);
                //console.log(mlon, mlat);
                Esfera(mlon, mlat, 0, 0.015, 10, 10, 0xff1122);
            });
            resolve(map);
        });
    });
}

function getPoints() {
    return new Promise((resolve, reject) => {
        int = 1; //variable para hacer más ameno el cambio de mes 

        loader.load("./SÍTYCLETA-2020.csv", function(text) {
            //console.log(text);
            let lines = text.split("\n");
            //Cargo archivo con información mde estaciones
            nest = 0;

            for (let line of lines) {
                //No trata primera línea al ser la cabecera
                if (nest > 0) {
                    //console.log(line);
                    //Separo por comas
                    let values = line.split(";");
                    //console.log(values);
                    fecha = values[0].substring(1, values[0].length - 1);
                    f0 = fecha.split("/")[1];
                    if (f0 == ("0" + int)) {
                        //ALmacena localización estaciones
                        de = (values[3].substring(0, values[3].length));
                        a = (values[4].substring(0, values[4].length - 1));
                        de_a.push([de, a]);
                    }
                }
                nest += 1;
            }

            //console.log(de_a);
            //console.log(map);
            //Objeto para cada estación
            for (let i of de_a) {
                //console.log(i);
                if (map.has(i[0]) && map.has(i[1])) {
                    //console.log(i[0], i[1]);
                    let mlon1 = Mapeo(map.get(i[0])[1], minlon, maxlon, -mapsx / 2, mapsx / 2);
                    let mlat1 = Mapeo(map.get(i[0])[0], minlat, maxlat, -mapsy / 2, mapsy / 2);
                    let mlon2 = Mapeo(map.get(i[1])[1], minlon, maxlon, -mapsx / 2, mapsx / 2);
                    let mlat2 = Mapeo(map.get(i[1])[0], minlat, maxlat, -mapsy / 2, mapsy / 2);
                    //console.log(mlon, mlat);
                    Linea([
                            new THREE.Vector3(mlon1, mlat1, 0),
                            new THREE.Vector3(mlon2, mlat2, 0)
                        ],
                        colores[10]);
                }
            }

            resolve(de_a);
        });

        /* loader.load("./SÍTYCLETA-2021.csv", function(text) {
            //console.log(text);
            let lines = text.split("\n");
            //Cargo archivo con información mde estaciones
            nest = 0;

            for (let line of lines) {
                //No trata primera línea al ser la cabecera
                if (nest > 0) {
                    //console.log(line);
                    //Separo por comas
                    let values = line.split(";");
                    //console.log(values);
                    fecha = values[0].substring(1, values[0].length - 1);
                    f0 = fecha.split("/")[1];
                    if (f0 == ("0" + int)) {
                        //ALmacena localización estaciones
                        de = (values[3].substring(0, values[3].length));
                        a = (values[4].substring(0, values[4].length - 1));
                        de_a.push([de, a]);
                    }
                }
                nest += 1;
            }

            //console.log(de_a);
            //console.log(map);
            //Objeto para cada estación
            for (let i of de_a) {
                //console.log(i);
                if (map.has(i[0]) && map.has(i[1])) {
                    //console.log(i[0], i[1]);
                    let mlon1 = Mapeo(map.get(i[0])[1], minlon, maxlon, -mapsx / 2, mapsx / 2);
                    let mlat1 = Mapeo(map.get(i[0])[0], minlat, maxlat, -mapsy / 2, mapsy / 2);
                    let mlon2 = Mapeo(map.get(i[1])[1], minlon, maxlon, -mapsx / 2, mapsx / 2);
                    let mlat2 = Mapeo(map.get(i[1])[0], minlat, maxlat, -mapsy / 2, mapsy / 2);
                    //console.log(mlon, mlat);
                    Linea([
                            new THREE.Vector3(mlon1, mlat1, 0),
                            new THREE.Vector3(mlon2, mlat2, 0)
                        ],
                        colores[11]);
                }
            }

            resolve(de_a);
        }); */
    });
}

//Bucle de animación
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}