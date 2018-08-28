/**
 * Control surface and player interface.
 **/

 import { Mouse, Keyboard, NodeView, OverlayCanvas } from './ui';
 import { Clamp } from './maths';

 class Surface {
   constructor(scene, isMobile) {
     this.scene = scene;
     this.isMobile = isMobile;
     this.player = this.scene.player;
     this.camera = this.scene.camera.camera;
     this.worldVector = new THREE.Vector3();
     this.centre = {x: window.innerWidth / 2, y: window.innerHeight / 2};
     this.rotation = {};
     this.timestamp = null;
     this.clickThreshold = 150;

     // interactive nodes
     this.nodes = [];
     this.nodes.push(new NodeView(new THREE.Vector3(0, 3, 0), null));

     // dom stuff
     this.domElement = document.querySelector('.canvas-wrapper');
     this.keyboard = new Keyboard((key) => { this.onKeyboard(key); });
     this.mouse = new Mouse(this.domElement, (e) => { this.onMouseDown(e); }, (e) => { this.onMouseMove(e); }, (e) => { this.onMouseUp(e); });
     this.canvas = new OverlayCanvas(this, this.domElement);
     window.addEventListener('resize', () => { this.resize(); });
   }

   onMouseDown(e) {
     // record player rotation
     this.rotation.pitch = this.player.rotation.pitch;
     this.rotation.yaw = this.player.rotation.yaw;
     this.timestamp = Date.now();
     this.mouse.start(e);
   }

   onMouseMove(e) {
     this.mouse.move(e);

     if (this.mouse.active) {
       // update player rotation
       if (!(this.player.keys.left || this.player.keys.right)) {
         const yaw = this.rotation.yaw + this.mouse.delta.x / this.centre.x;
         const pitch = Clamp(this.rotation.pitch + this.mouse.delta.y / this.centre.y, this.player.minPitch, this.player.maxPitch);
         if (pitch == this.player.minPitch || pitch == this.player.maxPitch) {
           this.mouse.origin.y = e.clientY;
           this.rotation.pitch = pitch;
         }
         this.player.setRotation(pitch, yaw);
       }
     } else {
       // highlight ui nodes
       for (var i=0, len=this.nodes.length; i<len; ++i) {
         this.nodes[i].mouseOver(this.mouse.x, this.mouse.y);
       }
     }
   }

   onMouseUp(e) {
     this.mouse.stop();
     if (Date.now() - this.timestamp < this.clickThreshold) {
       // apply clickw
     }
   }

   onKeyboard(key) {
     switch (key) {
       case 'a': case 'A': case 'ArrowLeft':
         this.player.keys.left = this.keyboard.keys[key];
         break;
       case 'd': case 'D': case 'ArrowRight':
         this.player.keys.right = this.keyboard.keys[key];
         break;
       case 'w': case 'W': case 'ArrowUp':
         this.player.keys.up = this.keyboard.keys[key];
         break;
       case 's': case 'S': case 'ArrowDown':
         this.player.keys.down = this.keyboard.keys[key];
         break;
       case ' ':
         this.player.keys.jump = this.keyboard.keys[key];
         break;
       case 'x': case 'X':
         // toggle noclip on ctrl+x
         if (this.keyboard.keys['x'] || this.keyboard.keys['X']) {
           if (this.keyboard.isControl()) {
             this.player.toggleNoclip();
           }
           this.keyboard.release('x');
           this.keyboard.release('X');
         }
         break;
       default:
         break;
     }
   }

   resize() {
     //this.raycaster.resize();
     this.centre.x = window.innerWidth / 2;
     this.centre.y = window.innerHeight / 2;
     this.canvas.resize();
   }

   update(delta) {
     // update nodes
     this.camera.getWorldDirection(this.worldVector);
     this.activeNode = false;
     for (var i=0, len=this.nodes.length; i<len; ++i) {
       this.nodes[i].update(delta, this.player, this.camera, this.worldVector, this.centre);
       if (this.nodes[i].isHover()) {
         this.activeNode = true;
       }
     }
   }

   draw() {
     this.canvas.draw(this.nodes);
     this.canvas.promptTouchMove((this.mouse.active && (Date.now() - this.timestamp > 100)));
     this.canvas.promptClick((!this.mouse.active && this.activeNode), this.mouse.x, this.mouse.y);
     if (this.player.noclip) {
       this.canvas.promptGodMode();
     }
   }
 }

 export { Surface };
