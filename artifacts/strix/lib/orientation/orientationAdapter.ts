export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface OrientationEstimate {
  quaternion: Quaternion;
  yawRad: number;
  pitchRad: number;
  rollRad: number;
}

export function eulerToQuaternion(alphaRad: number, betaRad: number, gammaRad: number): Quaternion {
  const cy = Math.cos(alphaRad / 2);
  const sy = Math.sin(alphaRad / 2);
  const cp = Math.cos(betaRad / 2);
  const sp = Math.sin(betaRad / 2);
  const cr = Math.cos(gammaRad / 2);
  const sr = Math.sin(gammaRad / 2);
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

function normalizedQuaternion(input: Quaternion): Quaternion {
  const magnitude = Math.hypot(input.x, input.y, input.z, input.w);
  if (!Number.isFinite(magnitude) || magnitude < 1e-9) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
  return {
    x: input.x / magnitude,
    y: input.y / magnitude,
    z: input.z / magnitude,
    w: input.w / magnitude,
  };
}

/** Normalizes platform rotation-vector/quaternion values into a stable device orientation. */
export function adaptOrientation(input: Quaternion): OrientationEstimate {
  const quaternion = normalizedQuaternion(input);
  const { x, y, z, w } = quaternion;

  const sinRollCosPitch = 2 * (w * x + y * z);
  const cosRollCosPitch = 1 - 2 * (x * x + y * y);
  const rollRad = Math.atan2(sinRollCosPitch, cosRollCosPitch);

  const sinPitch = 2 * (w * y - z * x);
  const pitchRad = Math.abs(sinPitch) >= 1
    ? Math.sign(sinPitch) * Math.PI / 2
    : Math.asin(sinPitch);

  const sinYawCosPitch = 2 * (w * z + x * y);
  const cosYawCosPitch = 1 - 2 * (y * y + z * z);
  const yawRad = Math.atan2(sinYawCosPitch, cosYawCosPitch);

  return { quaternion, yawRad, pitchRad, rollRad };
}

/** Rotates a vector from device coordinates into the quaternion's reference frame. */
export function rotateVectorByQuaternion(vector: Vector3, input: Quaternion): Vector3 {
  const { x, y, z, w } = normalizedQuaternion(input);
  const tx = 2 * (y * vector.z - z * vector.y);
  const ty = 2 * (z * vector.x - x * vector.z);
  const tz = 2 * (x * vector.y - y * vector.x);
  return {
    x: vector.x + w * tx + (y * tz - z * ty),
    y: vector.y + w * ty + (z * tx - x * tz),
    z: vector.z + w * tz + (x * ty - y * tx),
  };
}

/** Smallest angular separation between two orientations, in radians. */
export function quaternionAngularDistance(a: Quaternion, b: Quaternion): number {
  const qa = normalizedQuaternion(a);
  const qb = normalizedQuaternion(b);
  const dot = Math.min(1, Math.abs(qa.x * qb.x + qa.y * qb.y + qa.z * qb.z + qa.w * qb.w));
  return 2 * Math.acos(dot);
}
