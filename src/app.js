import 'bulma'
import './style.scss'
import '@babel/polyfill'
import * as mm from '@magenta/music'
import './debug.js'
const CANNON = require('cannon')
const THREE = require('three')

const musicRNN= new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn')

import * as faceapi from 'face-api.js'
const webcamElement = document.getElementById('webcam')

console.log(faceapi)

let sad, surprised, happy

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo())

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => webcamElement.srcObject = stream,
    err => console.error(err)
  )
}

webcamElement.addEventListener('play', () => {
  const canvas = document.getElementById('canvas')
  const displaySize = { width: webcamElement.width, height: webcamElement.height }
  faceapi.matchDimensions(canvas, displaySize)
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(webcamElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    console.log(resizedDetections[0].expressions)
    happy = resizedDetections[0].expressions.happy
    surprised = resizedDetections[0].expressions.surprised
    canvas.width = webcamElement.width
    canvas.height= webcamElement.height
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    faceapi.draw.drawDetections(canvas, resizedDetections)
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    //console.log(faceapi)
  }, 100)
})

let world, body, shape, timeStep=1/60,
  camera, scene, renderer, geometry, material, mesh, groundBody, floor, groundShape, platform,   platCanArr = [], platThreeArr = [],  score = 0, playerMaterial, playerContactMaterial, wallMaterial,   playing = true, version  = 0, totalScore = 0, start = false, ready, expressionsObj


const scoreboard = document.getElementById('score')
scoreboard.innerHTML = 'SCORE: '+ (score +totalScore)




function initGame() {








  ready= true
  world = new CANNON.World()
  world.gravity.set(0,-20,0)
  world.broadphase = new CANNON.NaiveBroadphase()
  world.solver.iterations = 10

  wallMaterial = new CANNON.Material('wallMaterial')
  playerMaterial = new CANNON.Material('playerMaterial')


  playerContactMaterial = new CANNON.ContactMaterial(playerMaterial,wallMaterial)
  playerContactMaterial.friction = 0
  playerContactMaterial.restitution = 1.3


  world.addContactMaterial(playerContactMaterial)
  shape = new CANNON.Box(new CANNON.Vec3(1,1,1))



  body = new CANNON.Body({
    mass: 10, material: playerMaterial
  })

  body.addShape(shape)
  body.angularVelocity.set(0,0,0)
  body.angularDamping = 0.5
  world.addBody(body)
  body.position.y = 0




  scene = new THREE.Scene()
  //camera
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 )
  camera.position.x = -0.20861329770365564
  camera.position.y =  8.488600711758697
  camera.position.z = 62.37277465856009



  scene.add( camera )
  //lighting
  var Alight = new THREE.AmbientLight( 0x404040 ) // soft white light
  scene.add( Alight )
  const light = new THREE.DirectionalLight( 0xffffff )
  light.position.set( 0, 200, -110 )
  light.castShadow = true
  scene.add(light)


  //Objects
  geometry = new THREE.BoxGeometry( 2, 2, 2 )
  material =  new THREE.MeshPhongMaterial( { color: `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},1)`, specular: `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},1)` , shininess: 100, side: THREE.DoubleSide, opacity: 0.8,
    transparent: false } )


  //BOX

  mesh = new THREE.Mesh( geometry, material )



  function createPlatform(x,y,z){
    groundShape = new CANNON.Box(new CANNON.Vec3(10,40,1))
    groundBody = new CANNON.Body({ mass: 0, material: wallMaterial })
    groundBody.addShape(groundShape)
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2)
    groundBody.position.set(0,0,0)
    groundBody.position.x = x
    groundBody.position.y = y
    groundBody.position.z = z

    world.addBody(groundBody)
    platCanArr.push(groundBody)


    platform = new THREE.BoxGeometry( 20, 80, 2 )
    material =  new THREE.MeshPhongMaterial( { color: `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},1)`, specular: `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},1)` , shininess: 100, side: THREE.DoubleSide, opacity: 0.8,
      transparent: false } )

    const platMesh = new THREE.Mesh( platform, material )

    platMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2)
    platMesh.position.x = x
    platMesh.position.y = y
    platMesh.position.z = z

    scene.add(platMesh)
    platThreeArr.push(platMesh)
  }


  createPlatform(0,-20,0)

  for(let i=1;i<25;i ++ ){
    createPlatform(40*i,i+10,0)

  }


  const game = document.getElementById('game')
  scene.add( mesh, floor )
  renderer = new THREE.WebGLRenderer()
  renderer.setSize( window.innerWidth-250, window.innerHeight-400 )
  game.appendChild( renderer.domElement )


}


const cannonDebugRenderer = new THREE.CannonDebugRenderer( scene, world )



let time = 0
function animate() {

  if(happy>0.9){
    body.velocity.y++
  }
  if(surprised>0.9){
    body.velocity.x++
  }
  score = platThreeArr.filter(x=> x.position.z > mesh.position.z).length
  time+=0.01
  camera.position.x = mesh.position.x+ 0.20861329770365564
  camera.position.y = mesh.position.y + 9.488600711758697
  camera.position.z = mesh.position.z+ 52.37277465856009

  if(platThreeArr.filter(x=> x.position.y < mesh.position.y).length ===0){

    playing = false
  }

  if(platThreeArr.filter(x=> x.position.z > mesh.position.z).length === platThreeArr.length && playing){
    totalScore += platThreeArr.length
    version++
    body.position.z = 0
    world.gravity.y -= 5

  }



  for(let i=1;i<platThreeArr.length;i++){
    if(i%2===0 && version%2===0 ){
      platThreeArr[i].rotation.z += 0.01

    }

    if(i%3===0 && i%2!==0 && version%2===0){
      platThreeArr[i].rotation.y += 0.01
      platThreeArr[i].position.y = i*2+ Math.sin(time) * 20
    }

    if(i%5===0 && i%2!==0 && version%2===0){

      platThreeArr[i].position.y = i*2+( Math.sin(time) * 25) -20
    }

    if(i%4===0 && version%2!==0 ){
      platThreeArr[i].rotation.y += 0.01
      platThreeArr[i].position.x = i*2+ Math.sin(time) * 20


    }

    if(i%3===0 && i%2!==0 && version%2!==0){
      platThreeArr[i].position.y = i*2+( Math.sin(time) * 25) -20
    }

    if(i%5===0 && i%2!==0 && version%2!==0){
      platThreeArr[i].rotation.z += 0.01

    }


  }

  if(scoreboard && !playing){
    scoreboard.innerHTML = ' GAME OVER: R TO RESET'
  }

  if(cannonDebugRenderer){

    //cannonDebugRenderer.update()
  }
  if(scoreboard && playing){
    //scoreboard.innerHTML = 'SCORE: '+ (score +totalScore)
    scoreboard.innerHTML = 'happy: '+ happy + ' surprised: '+ surprised
  }

  //controls.update()
  requestAnimationFrame( animate )
  updatePhysics()
  render()

}
function updatePhysics() {
  // Step the physics world
  world.step(timeStep)
  for(var i=0; i<platCanArr.length; i++){
    platCanArr[i].position.copy(platThreeArr[i].position)
    platCanArr[i].quaternion.copy(platThreeArr[i].quaternion)
  }

  mesh.position.copy(body.position)
  mesh.quaternion.copy(body.quaternion)


}
function render() {
  renderer.render( scene, camera )
}

initGame()
animate()
