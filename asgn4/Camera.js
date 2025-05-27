class Camera {
    constructor() {
        this.eye = new Vector(0, 0, 3);
        this.at = new Vector(10, 10, -100);
        this.up = new Vector(0, 1, 0);
        this.fov = 60;
    }

    forward() {
        var f = this.at.subtract(this.eye);
        f = f.divide(f.length());
        this.at = this.at.add(f);
        this.eye = this.eye.add(f);
    }

    back() {
        var f = this.eye.subtract(this.at);
        f = f.divide(f.length());
        this.at = this.at.add(f);
        this.eye = this.eye.add(f);
    }

    left() {
        var f = this.eye.subtract(this.at);
        f = f.divide(f.length());
        var s = f.cross(this.up);
        s = s.divide(s.length());
        this.at = this.at.add(s);
        this.eye = this.eye.add(s);
    }

    right() {
        var f = this.eye.subtract(this.at);
        f = f.divide(f.length());
        var s = f.cross(this.up);
        s = s.divide(s.length());
        this.at = this.at.subtract(s);
        this.eye = this.eye.subtract(s);
    }

    rotateLeft() {
        const dir = this.at.subtract(this.eye);
        const up = this.up.normalize();
        const angle = 5 * Math.PI / 180;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // scale the direction vector
        const dirScaled = dir.multiply(cosA);
        // cross product
        const crossProduct = up.cross(dir).multiply(sinA);
        // dot product
        const dotProduct = up.dot(dir);
        // scale the up vector
        const upScaled = up.multiply(dotProduct).multiply(1 - cosA);

        const newDir = dirScaled.add(crossProduct).add(upScaled);
        this.at = this.eye.add(newDir);
    }

    rotateRight() {
        const dir = this.at.subtract(this.eye);
        const up = this.up.normalize();
        const angle = 5 * Math.PI / 180;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        // scale the direction vector
        const dirScaled = dir.multiply(cosA);
        // cross product
        const crossProduct = up.cross(dir).multiply(sinA);
        // dot product
        const dotProduct = up.dot(dir);
        // scale the up vector
        const upScaled = up.multiply(dotProduct).multiply(1 - cosA);

        const newDir = dirScaled.add(crossProduct).add(upScaled);
        this.at = this.eye.add(newDir);
    }

    tiltUp() {
        var dir = this.at.subtract(this.eye);
        var right = dir.cross(this.up).normalize();
        let angle = 5 * Math.PI / 180; // 5 degrees in radians
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        // scale the direction vector
        var dirScaled = dir.multiply(cosA);
        // cross product
        var crossProduct = right.cross(dir).multiply(sinA);
        // dot product
        var dotProduct = right.dot(dir);
        // scale the perpendicular vector
        var rightScaled = right.multiply(dotProduct).multiply(1 - cosA);

        var newDir = dirScaled.add(crossProduct).add(rightScaled);
        this.at = this.eye.add(newDir);
    }

    tiltDown() {
        var dir = this.at.subtract(this.eye);
        var right = dir.cross(this.up).normalize();
        let angle = 5 * Math.PI / 180; // negative for downward tilt
        var cosA = Math.cos(-angle);
        var sinA = Math.sin(-angle);

        // scale the direction vector
        var dirScaled = dir.multiply(cosA);
        // cross product
        var crossProduct = right.cross(dir).multiply(sinA);
        // dot product
        var dotProduct = right.dot(dir);
        // scale the perpendicular vector
        var rightScaled = right.multiply(dotProduct).multiply(1 - cosA);

        var newDir = dirScaled.add(crossProduct).add(rightScaled);
        this.at = this.eye.add(newDir);
    }

}