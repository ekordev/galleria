/**
 ** Interaction Node
 ** Convert UI screenspace interaction to world space. Perform actions.
 **/

class InteractionNode {
  constructor(position, rotation, clipping, root) {
    this.onscreen = true;
    this.position = position;
    this.rotation = rotation;
    this.clipping = clipping || null;
    this.coords = new THREE.Vector2();
    this.helper = new THREE.Vector3();

    // artwork root
    this.root = root;

    // attributes
    this.active = true;
    this.hover = false;
    this.cornersOK = false;
    this.buttonActive = false;
    this.buttonRadius = 32;
    this.buttonRadiusHalf = 16;
    this.buttonRadiusOffset = 24;
    this.buttonHover = false;
    this.textColour = Math.abs(position.x) <= 16 && (position.z > 10 || position.z < 0) ? '#884466' : "#fff";
    this.radius = {min: this.root.isMobile ? 10 : 9, max: 32};
    this.corners = {
      world: {a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3()},
      screen: {a: new THREE.Vector2(), b: new THREE.Vector2(), c: new THREE.Vector2(), d: new THREE.Vector2()}
    };
    this.distance = -1;
  }

  setCorners() {
    // set 3D corner positions
    const p = this.root.position;
    const v = this.root.direction;
    const s = this.root.board.scale;
    const scale = 0.5;
    const xo = v.x * this.root.thickness / 2;
    const zo = v.z * this.root.thickness / 2;
    this.corners.world.a.set(p.x - (v.x != 0 ? 0 : s.x * scale) + xo, p.y + s.y * scale, p.z - (v.z != 0 ? 0 : s.z * scale) + zo);
    this.corners.world.b.set(p.x + (v.x != 0 ? 0 : s.x * scale) + xo, p.y + s.y * scale, p.z + (v.z != 0 ? 0 : s.z * scale) + zo);
    this.corners.world.c.set(p.x + (v.x != 0 ? 0 : s.x * scale) + xo, p.y - s.y * scale, p.z + (v.z != 0 ? 0 : s.z * scale) + zo);
    this.corners.world.d.set(p.x - (v.x != 0 ? 0 : s.x * scale) + xo, p.y - s.y * scale, p.z - (v.z != 0 ? 0 : s.z * scale) + zo);
  }

  pointToScreen(p, camera, centre, target) {
    const point = p.clone();
    point.project(camera);
    target.x = (point.x + 1) * centre.x;
    target.y = (-point.y + 1) * centre.y;
  }

  updateCorners(camera, centre) {
    // calculate 2D corner positions and check for distortion
    this.pointToScreen(this.corners.world.a, camera, centre, this.corners.screen.a);
    this.pointToScreen(this.corners.world.b, camera, centre, this.corners.screen.b);
    this.pointToScreen(this.corners.world.c, camera, centre, this.corners.screen.c);
    this.pointToScreen(this.corners.world.d, camera, centre, this.corners.screen.d);
    const maxSize = this.root.isMobile ? window.innerWidth * 2.0 : window.innerWidth;
    this.cornersOK = (this.corners.screen.a.y < this.corners.screen.c.y && this.corners.screen.b.y < this.corners.screen.d.y) &&
      Math.abs(this.corners.screen.a.x - this.corners.screen.b.x) < window.innerWidth;
  }

  disableInfoTag() {
    this.infoTagDisabled = true;
  }

  isCorrectQuadrant(p) {
    // prevent clicking through walls by using set quadrants
    return ((p.x <= -16 || p.x >= 16 || this.position.x >= 16 || this.position.x <= -16) || ((p.z >= 6 && this.position.z >= 6) || (p.z <= 6 && this.position.z <= 6)));
  }

  mouseOver(x, y, player) {
    // check if mouse hover
    if (this.active && this.onscreen && this.cornersOK) {
      const minX = Math.min(this.corners.screen.a.x, this.corners.screen.b.x, this.corners.screen.c.x, this.corners.screen.d.x) - 10;
      const maxX = Math.max(this.corners.screen.a.x, this.corners.screen.b.x, this.corners.screen.c.x, this.corners.screen.d.x) + 10;
      const minY = Math.min(this.corners.screen.a.y, this.corners.screen.b.y) - 10;
      const maxY = Math.max(this.corners.screen.c.y, this.corners.screen.d.y) + 10;
      let bX = Math.max(this.corners.screen.c.x, this.corners.screen.d.x);
      let bY = (bX == this.corners.screen.c.x) ? this.corners.screen.c.y : this.corners.screen.d.y;
      bX += this.buttonRadius + 5;
      bY -= this.buttonRadius / 2;
      this.buttonHover = this.buttonActive && Math.hypot(bX - x, bY - y) < this.buttonRadius + 10;
      this.hover = (
        (this.buttonHover || (x >= minX && x <= maxX && y >= minY && y <= maxY)) &&
        this.isCorrectQuadrant(player)
      );
    } else {
      this.hover = false;
    }
  }

  isHover() {
    return this.hover && this.active;
  }

  calculateNodePosition(camera, worldVec, centre) {
    this.helper.copy(camera.position);
    this.helper.sub(this.position);
    this.helper.normalize();
    if (this.helper.dot(worldVec) <= 0) {
      this.onscreen = true;
      this.helper.copy(this.position);
      this.helper.project(camera);
      this.coords.x = (this.helper.x + 1) * centre.x;
      this.coords.y = (-this.helper.y + 1) * centre.y;
    } else {
      this.onscreen = false;
    }

    // clip plane
    if (this.clipping && this.onscreen) {
      this.helper.copy(camera.position);
      this.helper.sub(this.position);
      if (this.helper.dot(this.clipping) < 0) {
        this.onscreen = false;
      }
    }
  }

  update(delta, player, camera, worldVec, centre) {
    this.calculateNodePosition(camera, worldVec, centre);
    this.distance = player.position.distanceTo(this.position);

    //this.distance < this.radius.min ||
    if (this.distance > this.radius.max) {
      this.active = false;
    } else {
      this.active = true;

      // calculate 2d corner positions
      this.updateCorners(camera, centre);

      // check if inside min radius
      this.buttonActive = this.distance <= this.radius.min;
    }
  }

  draw(ctx) {
    if (this.onscreen && this.active && this.hover && this.cornersOK) {
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(this.corners.screen.a.x, this.corners.screen.a.y);
      ctx.lineTo(this.corners.screen.b.x, this.corners.screen.b.y);
      ctx.lineTo(this.corners.screen.c.x, this.corners.screen.c.y);
      ctx.lineTo(this.corners.screen.d.x, this.corners.screen.d.y);
      ctx.closePath();
      ctx.stroke();

      if (this.buttonActive) {
        let bX = Math.max(this.corners.screen.c.x, this.corners.screen.d.x);
        let bY = (bX == this.corners.screen.c.x ? this.corners.screen.c.y : this.corners.screen.d.y);
        bX += this.buttonRadius + 5;
        bY -= this.buttonRadius / 2;
        ctx.fillStyle = this.textColour;
        ctx.textAlign = 'start';
        ctx.globalAlpha = this.buttonHover && !this.infoTagDisabled ? 0.6 : 1;

        if (!this.infoTagDisabled) {
          ctx.fillText('[info]', bX - this.buttonRadiusOffset, bY + 4);

          if (!this.root.isMobile) {
            ctx.fillText(this.root.data.title, bX - this.buttonRadiusOffset, bY - this.buttonRadiusHalf);
          }
        }
      }
    }
  }
}

export default InteractionNode;