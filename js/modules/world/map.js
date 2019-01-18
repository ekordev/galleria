/**
 ** Handle model loading and update.
 **/

import { Materials } from './materials';
import { Loader } from '../loaders';

class Map {
  constructor(root) {
    this.root = root;
    this.scene = root.scene;
    this.colliderSystem = root.colliderSystem;
    this.materials = new Materials('assets');
    this.loader = new Loader('assets');
    this.loadScene();
    this.reloadInstallation();
  }

  loadScene() {
    // invisible floor
    this.floor = new THREE.Mesh(new THREE.BoxBufferGeometry(100, 1, 100), new THREE.MeshPhongMaterial({}));
    this.floor.position.y = -0.25;
    this.colliderSystem.add(this.floor);

    // onloads
    this.toLoad = 2;
    this.checkLoaded = () => {
      this.toLoad -= 1;
      if (this.toLoad == 0) {
        const target = document.querySelector('#open-gallery');
        target.classList.remove('is-loading');
        target.classList.add('flash');
        target.innerHTML = '<span class="mobile-show">&larr;&nbsp;Open Gallery</span><span class="mobile-hide">Open Gallery</span>';
      }
    };

    // visual map
    this.loader.loadFBX('map').then((map) => {
      this.scene.add(map);
      this.materials.conformGroup(map);
      this.checkLoaded();
    }, (err) => { console.log(err); });

    // collision map
    this.loader.loadOBJ('collision').then((map) => {
      this.defaultCollisionMap = map;
      this.addCollisionMap(map);
      this.checkLoaded();
    }, (err) => { console.log(err); });

    // peripherals props
    this.loader.loadFBX('props').then((map) => {
      this.scene.add(map);
      this.materials.conformGroup(map);
    });

    // neon ceiling lighting
    const size = 0.1;
    const rodSize = 4;
    for (var x=-16; x<=16; x+=8) {
      const y = 19;
      const mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(size, size, rodSize), this.materials.mat.neon);
      const holster = new THREE.Mesh(new THREE.BoxBufferGeometry(size, size * 4, rodSize), this.materials.mat.dark);
      const rod1 = new THREE.Mesh(new THREE.BoxBufferGeometry(size, 1, size), this.materials.mat.dark);
      const rod2 = rod1.clone();
      mesh.position.set(x, y, 6);
      holster.position.set(x, y + size * 2.5, 6);
      rod1.position.set(x, y + size * 4.5 + 0.5, 6 + rodSize / 3);
      rod2.position.set(x, y + size * 4.5 + 0.5, 6 - rodSize / 3);
      rod1.rotation.y = Math.PI / 4;
      rod2.rotation.y = Math.PI / 4;
      this.scene.add(mesh, holster, rod1, rod2);
    }
  }

  reloadInstallation() {
    // remove current installation
    if (this.customExhibitionActive && this.installation) {
      this.installation.forEach(obj => {
        if (obj.object) {
          this.scene.remove(obj.object);
        }
      });

      // reload collision map
      this.root.colliderSystem = new Collider.System();
      this.colliderSystem = this.root.colliderSystem;
      this.addCollisionMap(this.defaultCollisionMap);
    }

    // reset
    this.customExhibitionActive = false;
    this.updateCustomExhibition = false;
    this.installation = [];
    const target = document.querySelector('.active-exhibition-data .custom-exhibition-installation');

    // add new installation from data
    if (target) {
      // load exhibition-specific installations
      const customExhibition = target.dataset.value;

      switch (customExhibition) {
        case 'JACK_DE_LACY':
          // custom installation container
          this.installation = [{
              src: 'jack_de_lacy/sculpture_1',
              scale: 0.6,
              rot: Math.PI / 32,
              orientZ: Math.PI / 4,
            }, {
              src: 'jack_de_lacy/sculpture_2',
              scale: 0.5,
              rot: -Math.PI / 32,
              orientZ: 0,
            }, {
              src: 'jack_de_lacy/sculpture_3',
              scale: 0.5,
              rot: Math.PI / 32,
              orientZ: 0,
            }
          ];

          // load assets async
          for (var i=0; i<this.installation.length; ++i) {
            const index = i;
            this.loader.loadFBX(this.installation[index].src).then((obj) => {
              const e = this.installation[index];
              obj.children.forEach(child => {
                this.materials.conformMaterial(child.material);
                child.material = this.materials.getCustomMaterial(child.material);
                if (index == 2) {
                  child.material.side = THREE.DoubleSide;
                }
                child.material.envMapIntensity = 0.25;
              });
              obj.scale.multiplyScalar(e.scale);
              obj.rotation.z = e.orientZ;
              obj.position.set(-12 + index * 12, 14, 6);
              this.scene.add(obj);
              e.object = obj;
              e.active = true;
            }, (err) => { console.log(err); });
          }

          // installation active flag
          this.customExhibitionActive = true;

          // installation update
          this.updateCustomExhibition = (delta) => {
            this.installation.forEach(obj => {
              if (obj.active) {
                obj.object.rotation.y += obj.rot * delta;
              }
            });
          }
          break;
        case 'TIYAN':
          // load
          this.loader.loadFBX('tiyan/separators').then(obj => {
            this.materials.conformGroup(obj);
            this.scene.add(obj);
          });

          // add separator collisions
          const mesh1 = new THREE.Mesh(new THREE.BoxBufferGeometry(14, 4, 1.5), new THREE.MeshStandardMaterial({}));
          const mesh2 = new THREE.Mesh(new THREE.BoxBufferGeometry(1.5, 4, 16), new THREE.MeshStandardMaterial({}));
          mesh1.position.set(-23, 1, 6);
          mesh2.position.set(17.25, 1, 15.5);
          this.colliderSystem.add(mesh1);
          this.colliderSystem.add(mesh2);

          // installation active flag, update func
          this.customExhibitionActive = true;
          //this.updateCustomExhibition = (delta) => {};
          break;
        default:
          break;
      }
    }
  }

  addCollisionMap(obj) {
    // recursively add object group to collider
    if (obj.type === 'Mesh') {
      this.colliderSystem.add(obj);
    } else if (obj.children && obj.children.length) {
      obj.children.forEach(child => { this.addCollisionMap(child); });
    }
  }

  loadExperimental() {
    this.treeParse = (obj) => {
      if (obj.type == "Mesh") {
        if (obj.material.transparent) {
          console.log(obj.material);
          obj.material.color.set(0xffffff);
          obj.material.side = THREE.DoubleSide;
          obj.material.flatShading = true;
        }
      } else if (obj.children) {
        obj.children.forEach(child => { this.treeParse(child); });
      }
    };
    this.loader.loadFBX('tree/tree2').then(tree => {
      console.log(tree);
      this.treeParse(tree);
      this.scene.add(tree);
    });
  }

  update(delta) {
    this.materials.update(delta);
    if (this.customExhibitionActive && this.updateCustomExhibition) {
      this.updateCustomExhibition(delta);
    }
  }
}

export { Map };
