import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, BarChart, Bar, ComposedChart } from 'recharts';

const DEFAULT_PARAMS = {
PRESSURE_MPa: 0.3,
PRESTON_COEFFICIENT: 3e-8,
HOTSPOT_MARKER_SIZE: 3,
RING_RPM: -3.9,
SUN_RPM: 17.1,
UPPER_RPM: -12.5,
LOWER_RPM: 23.6,
SUN_GEAR_TEETH: 96,
RING_GEAR_TEETH: 338,
CARRIER_GEAR_TEETH: 121,
CARRIER_GEAR_RADIUS: 372,
SUN_GEAR_RADIUS: 267,
RING_GEAR_RADIUS: 987.5,
PLATE_INNER_RADIUS: 295,
PLATE_OUTER_RADIUS: 935,
WAFER_RADIUS: 150,
center_axis_to_carrier_distance: 639,
wafer_to_carrier_distance: 198,
DISTANCES_FROM_WAFER_CENTER_0: 0,
DISTANCES_FROM_WAFER_CENTER_150: 150,
num_carriers: 1,
num_wafers_per_carrier: 1,
num_points: 15,
TOTAL_TIME: 500,
display_option: "lower",
path: true,
enable_anim_123: false
};

class UnifiedGearSimulation {
constructor(params, timeStep, frictionTimeSteps) {
    this.params = params;
    this.rpmSun = this.params.SUN_RPM;
    this.rpmInt = this.params.RING_RPM;
    this.rpmUpper = this.params.UPPER_RPM;
    this.rpmLower = this.params.LOWER_RPM;
    this.zSun = this.params.SUN_GEAR_TEETH;
    this.zInt = this.params.RING_GEAR_TEETH;
    this.rSun = this.params.SUN_GEAR_RADIUS;
    this.rInt = this.params.RING_GEAR_RADIUS;
    this.rCarrier = this.params.CARRIER_GEAR_RADIUS;
    this.waferRadius = this.params.WAFER_RADIUS;
    this.centerAxisToCarrierDistance = this.params.center_axis_to_carrier_distance;
    this.waferToCarrierDistance = this.params.wafer_to_carrier_distance;
    this.numCarriers = this.params.num_carriers;
    this.numWafersPerCarrier = this.params.num_wafers_per_carrier;
    this.numPoints = this.params.num_points;
    this.totalTime = this.params.TOTAL_TIME;
    this.timeStep = timeStep || 0.1;
    this.secondsPerMinute = 60;
    this.rpmToRad = 2 * Math.PI / this.secondsPerMinute;
    
    this.carrRevRpm = this.carrierRevolutionSpeed();
    this.carrRotRpm = this.carrierRotationSpeed();
    this.waferRpm = this.waferRotationSpeed();
    this.carrRevOmega = this.rpmToRadS(this.carrRevRpm);
    this.carrRotOmega = this.rpmToRadS(this.carrRotRpm);
    this.omegaTotal = this.carrRevOmega + this.carrRotOmega;
    
    const nSteps = Math.floor(this.totalTime / this.timeStep) + 1;
    this.timeArray = this.linspace(0, this.totalTime, nSteps);
    
    this.waferOffsets = [];
    for (let wIdx = 0; wIdx < this.numWafersPerCarrier; wIdx++) {
    this.waferOffsets.push(2 * Math.PI * (wIdx / this.numWafersPerCarrier));
    }

    this.carrierOffsets = [];
    for (let cIdx = 0; cIdx < this.numCarriers; cIdx++) {
    this.carrierOffsets.push(2 * Math.PI * (cIdx / this.numCarriers));
    }
}

linspace(start, stop, num) {
    const arr = [];
    const step = (stop - start) / (num - 1);
    for (let i = 0; i < num; i++) {
    arr.push(start + step * i);
    }
    return arr;
}

rpmToRadS(rpm) {
    return rpm * this.rpmToRad;
}

carrierRevolutionSpeed() {
    return (this.zSun * this.rpmSun + this.zInt * this.rpmInt) / (this.zSun + this.zInt);
}

carrierRotationSpeed() {
    return (this.rInt * this.rpmInt - this.rSun * this.rpmSun) / (2.0 * this.rCarrier);
}

waferRotationSpeed() {
    return (this.rpmUpper + this.rpmLower) - 2.0 * this.carrierRevolutionSpeed();
}

carrierPosition(t, cIdx = 0) {
    const carrierAngle = this.carrRevOmega * t + this.carrierOffsets[cIdx];
    const cx = this.centerAxisToCarrierDistance * Math.cos(carrierAngle);
    const cy = this.centerAxisToCarrierDistance * Math.sin(carrierAngle);
    return [cx, cy];
}

waferCenterPosition(t, cIdx = 0, wIdx = 0) {
    const [cx, cy] = this.carrierPosition(t, cIdx);
    const offsetAngle = this.carrRotOmega * t + this.waferOffsets[wIdx] + this.carrierOffsets[cIdx];
    const wx = cx + this.waferToCarrierDistance * Math.cos(offsetAngle);
    const wy = cy + this.waferToCarrierDistance * Math.sin(offsetAngle);
    return [wx, wy];
}

pointPosition(t, rWafer, thetaWafer, cIdx = 0, wIdx = 0) {
    const [wxC, wyC] = this.waferCenterPosition(t, cIdx, wIdx);
    const angleLocal = this.omegaTotal * t + thetaWafer;
    const px = wxC + rWafer * Math.cos(angleLocal);
    const py = wyC + rWafer * Math.sin(angleLocal);
    return [px, py];
}

generateUniformPointsInCircle(radius, numPoints) {
    const pts = [];
    for (let i = 0; i < numPoints; i++) {
    const theta = 2 * Math.PI * i / numPoints;
    const r = radius * Math.sqrt(Math.random());
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    pts.push([x, y]);
    }
    return pts;
}

computeCumulativeDistanceMap(category, gridSize = 20) {
    const radius = this.waferRadius;
    const step = (2 * radius) / (gridSize - 1);
    const distanceMap = [];
    
    for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
        const x = -radius + i * step;
        const y = -radius + j * step;
        const r = Math.sqrt(x * x + y * y);
        
        if (r <= radius) {
        const theta = Math.atan2(y, x);
        let totalDistance = 0;
        let prevPosition = null;
        
        for (let timeIdx = 0; timeIdx < this.timeArray.length; timeIdx++) {
            const t = this.timeArray[timeIdx];
            const position = this.getPositionAtTime(t, r, theta, 0, 0)[category];
            
            if (prevPosition) {
            const dx = position.x - prevPosition.x;
            const dy = position.y - prevPosition.y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
            prevPosition = position;
        }
        
        row.push({
            x: x,
            y: y,
            z: totalDistance,
            r: r,
            theta: theta
        });
        } else {
        row.push(null);
        }
    }
    distanceMap.push(row);
    }
    
    return distanceMap;
}

computeCoverageAndCrossings() {
    const categories = ['basic', 'upper', 'lower', 'combined'];
    const binInterval = 5;
    const xBins = [];
    for (let x = -this.rInt; x <= this.rInt + binInterval; x += binInterval) {
    xBins.push(x);
    }
    const binCenters = [];
    for (let i = 0; i < xBins.length - 1; i++) {
    binCenters.push((xBins[i] + xBins[i + 1]) / 2);
    }

    const coveragePositions = {};
    const xCrossings = {};
    categories.forEach(cat => {
    coveragePositions[cat] = { x: [], y: [] };
    xCrossings[cat] = new Array(binCenters.length).fill(0);
    });

    const waferPoints = this.generateUniformPointsInCircle(this.waferRadius, this.numPoints);

    for (const t of this.timeArray) {
    for (let cIdx = 0; cIdx < this.numCarriers; cIdx++) {
        for (let wIdx = 0; wIdx < this.numWafersPerCarrier; wIdx++) {
        for (const [dx, dy] of waferPoints) {
            const angleBasic = this.omegaTotal * t;
            const [wxc, wyc] = this.waferCenterPosition(t, cIdx, wIdx);
            const basicX = wxc + dx * Math.cos(angleBasic) - dy * Math.sin(angleBasic);
            const basicY = wyc + dx * Math.sin(angleBasic) + dy * Math.cos(angleBasic);

            const upperOmega = this.rpmToRadS(this.rpmUpper) * t;
            const ux = basicX * Math.cos(upperOmega) - basicY * Math.sin(upperOmega);
            const uy = basicX * Math.sin(upperOmega) + basicY * Math.cos(upperOmega);

            const lowerOmega = this.rpmToRadS(this.rpmLower) * t;
            const lx = basicX * Math.cos(lowerOmega) - basicY * Math.sin(lowerOmega);
            const ly = basicX * Math.sin(lowerOmega) + basicY * Math.cos(lowerOmega);

            const cx = (ux + lx) / 2.0;
            const cy = (uy + ly) / 2.0;

            const xValues = [basicX, ux, lx, cx];
            categories.forEach((cat, catIdx) => {
            const xVal = xValues[catIdx];
            if (Math.abs(xVal) >= this.rSun && Math.abs(xVal) <= this.rInt) {
                for (let i = 0; i < xBins.length - 1; i++) {
                if (xVal >= xBins[i] && xVal < xBins[i + 1]) {
                    xCrossings[cat][i]++;
                    break;
                }
                }
            }
            });

            coveragePositions['basic'].x.push(basicX);
            coveragePositions['basic'].y.push(basicY);
            coveragePositions['upper'].x.push(ux);
            coveragePositions['upper'].y.push(uy);
            coveragePositions['lower'].x.push(lx);
            coveragePositions['lower'].y.push(ly);
            coveragePositions['combined'].x.push(cx);
            coveragePositions['combined'].y.push(cy);
        }
        }
    }
    }

    const totalSamples = this.timeArray.length * this.numCarriers * this.numWafersPerCarrier * waferPoints.length;
    categories.forEach(cat => {
    for (let i = 0; i < xCrossings[cat].length; i++) {
        xCrossings[cat][i] /= totalSamples;
    }
    });

    return { coveragePositions, xCrossings, binCenters };
}

trackSinglePointTrajectory(rWafer, thetaWafer, cIdx = 0, wIdx = 0) {
    const trajectory = {
    basic: [],
    upper: [],
    lower: [],
    combined: []
    };

    for (const t of this.timeArray) {
    const [basicX, basicY] = this.pointPosition(t, rWafer, thetaWafer, cIdx, wIdx);
    
    const upperOmega = this.rpmToRadS(this.rpmUpper) * t;
    const ux = basicX * Math.cos(upperOmega) - basicY * Math.sin(upperOmega);
    const uy = basicX * Math.sin(upperOmega) + basicY * Math.cos(upperOmega);

    const lowerOmega = this.rpmToRadS(this.rpmLower) * t;
    const lx = basicX * Math.cos(lowerOmega) - basicY * Math.sin(lowerOmega);
    const ly = basicX * Math.sin(lowerOmega) + basicY * Math.cos(lowerOmega);

    const cx = (ux + lx) / 2.0;
    const cy = (uy + ly) / 2.0;

    trajectory.basic.push({ t, x: basicX, y: basicY });
    trajectory.upper.push({ t, x: ux, y: uy });
    trajectory.lower.push({ t, x: lx, y: ly });
    trajectory.combined.push({ t, x: cx, y: cy });
    }

    return trajectory;
}

calculateVelocity(trajectory, category) {
    const velocities = [];
    for (let i = 1; i < trajectory[category].length; i++) {
    const prev = trajectory[category][i - 1];
    const curr = trajectory[category][i];
    const dt = curr.t - prev.t;
    const vx = (curr.x - prev.x) / dt;
    const vy = (curr.y - prev.y) / dt;
    const vmag = Math.sqrt(vx * vx + vy * vy);
    velocities.push({ t: curr.t, vx, vy, vmag });
    }
    return velocities;
}

getPositionAtTime(t, rWafer, thetaWafer, cIdx = 0, wIdx = 0) {
    const [basicX, basicY] = this.pointPosition(t, rWafer, thetaWafer, cIdx, wIdx);
    
    const upperOmega = this.rpmToRadS(this.rpmUpper) * t;
    const ux = basicX * Math.cos(upperOmega) - basicY * Math.sin(upperOmega);
    const uy = basicX * Math.sin(upperOmega) + basicY * Math.cos(upperOmega);

    const lowerOmega = this.rpmToRadS(this.rpmLower) * t;
    const lx = basicX * Math.cos(lowerOmega) - basicY * Math.sin(lowerOmega);
    const ly = basicX * Math.sin(lowerOmega) + basicY * Math.cos(lowerOmega);

    const cx = (ux + lx) / 2.0;
    const cy = (uy + ly) / 2.0;

    return {
    basic: { x: basicX, y: basicY },
    upper: { x: ux, y: uy },
    lower: { x: lx, y: ly },
    combined: { x: cx, y: cy }
    };
}

getCarrierPositionsAtTime(t) {
    const positions = [];
    for (let cIdx = 0; cIdx < this.numCarriers; cIdx++) {
    const [cx, cy] = this.carrierPosition(t, cIdx);
    const wafers = [];
    for (let wIdx = 0; wIdx < this.numWafersPerCarrier; wIdx++) {
        const [wx, wy] = this.waferCenterPosition(t, cIdx, wIdx);
        wafers.push({ x: wx, y: wy, index: wIdx });
    }
    positions.push({ x: cx, y: cy, index: cIdx, wafers });
    }
    return positions;
}

getTransformedCarrierPositionsAtTime(t, category) {
    const basicPositions = this.getCarrierPositionsAtTime(t);
    
    if (category === 'basic') {
    return basicPositions;
    }
    
    const transformedPositions = [];
    
    for (const carrier of basicPositions) {
    let transformedCarrier = { ...carrier };
    let transformedWafers = [];
    
    for (const wafer of carrier.wafers) {
        let transformedWafer = { ...wafer };
        
        if (category === 'upper') {
        const upperOmega = this.rpmToRadS(this.rpmUpper) * t;
        const carrierX = carrier.x * Math.cos(upperOmega) - carrier.y * Math.sin(upperOmega);
        const carrierY = carrier.x * Math.sin(upperOmega) + carrier.y * Math.cos(upperOmega);
        transformedCarrier.x = carrierX;
        transformedCarrier.y = carrierY;
        
        const waferX = wafer.x * Math.cos(upperOmega) - wafer.y * Math.sin(upperOmega);
        const waferY = wafer.x * Math.sin(upperOmega) + wafer.y * Math.cos(upperOmega);
        transformedWafer.x = waferX;
        transformedWafer.y = waferY;
        
        } else if (category === 'lower') {
        const lowerOmega = this.rpmToRadS(this.rpmLower) * t;
        const carrierX = carrier.x * Math.cos(lowerOmega) - carrier.y * Math.sin(lowerOmega);
        const carrierY = carrier.x * Math.sin(lowerOmega) + carrier.y * Math.cos(lowerOmega);
        transformedCarrier.x = carrierX;
        transformedCarrier.y = carrierY;
        
        const waferX = wafer.x * Math.cos(lowerOmega) - wafer.y * Math.sin(lowerOmega);
        const waferY = wafer.x * Math.sin(lowerOmega) + wafer.y * Math.cos(lowerOmega);
        transformedWafer.x = waferX;
        transformedWafer.y = waferY;
        
        } else if (category === 'combined') {
        const upperOmega = this.rpmToRadS(this.rpmUpper) * t;
        const lowerOmega = this.rpmToRadS(this.rpmLower) * t;
        
        const ux_carrier = carrier.x * Math.cos(upperOmega) - carrier.y * Math.sin(upperOmega);
        const uy_carrier = carrier.x * Math.sin(upperOmega) + carrier.y * Math.cos(upperOmega);
        const ux_wafer = wafer.x * Math.cos(upperOmega) - wafer.y * Math.sin(upperOmega);
        const uy_wafer = wafer.x * Math.sin(upperOmega) + wafer.y * Math.cos(upperOmega);
        
        const lx_carrier = carrier.x * Math.cos(lowerOmega) - carrier.y * Math.sin(lowerOmega);
        const ly_carrier = carrier.x * Math.sin(lowerOmega) + carrier.y * Math.cos(lowerOmega);
        const lx_wafer = wafer.x * Math.cos(lowerOmega) - wafer.y * Math.sin(lowerOmega);
        const ly_wafer = wafer.x * Math.sin(lowerOmega) + wafer.y * Math.cos(lowerOmega);
        
        transformedCarrier.x = (ux_carrier + lx_carrier) / 2.0;
        transformedCarrier.y = (uy_carrier + ly_carrier) / 2.0;
        transformedWafer.x = (ux_wafer + lx_wafer) / 2.0;
        transformedWafer.y = (uy_wafer + ly_wafer) / 2.0;
        }
        
        transformedWafers.push(transformedWafer);
    }
    
    transformedCarrier.wafers = transformedWafers;
    transformedPositions.push(transformedCarrier);
    }
    
    return transformedPositions;
}
}

const Circle = ({ cx, cy, r, fill, stroke, strokeWidth = 1, opacity = 1 }) => (
<circle 
    cx={cx} 
    cy={cy} 
    r={r} 
    fill={fill || 'none'} 
    stroke={stroke || '#000'} 
    strokeWidth={strokeWidth}
    opacity={opacity}
/>
);

const UnifiedGearSimulationApp = () => {
const [params, setParams] = useState(DEFAULT_PARAMS);
const [selectedPoints, setSelectedPoints] = useState([
    { r: 1, theta: 0, carrierIdx: 0, waferIdx: 0, name: 'Center Point' },
    { r: 150, theta: Math.PI/4, carrierIdx: 0, waferIdx: 0, name: 'Edge Point' }
]);
const [activeCategory, setActiveCategory] = useState('lower');
const [isAnimating, setIsAnimating] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [animationSpeed, setAnimationSpeed] = useState(1.0);
const [showTrail, setShowTrail] = useState(true);
const [trailLength, setTrailLength] = useState(200);
const [activeTab, setActiveTab] = useState('trajectory');

const simulation = useMemo(() => {
    try {
    return new UnifiedGearSimulation(params, 0.1, 60);
    } catch (error) {
    console.error('Simulation error:', error);
    return null;
    }
}, [params]);

const multiTrajectoryData = useMemo(() => {
    if (!simulation) return null;
    
    const allTrajectories = [];
    
    for (let cIdx = 0; cIdx < simulation.numCarriers; cIdx++) {
    for (let wIdx = 0; wIdx < simulation.numWafersPerCarrier; wIdx++) {
        for (let pIdx = 0; pIdx < selectedPoints.length; pIdx++) {
        const point = selectedPoints[pIdx];
        const trajectory = simulation.trackSinglePointTrajectory(point.r, point.theta, cIdx, wIdx);
        
        allTrajectories.push({
            id: `${cIdx}-${wIdx}-${pIdx}`,
            name: `${point.name} (C${cIdx}W${wIdx})`,
            r: point.r,
            theta: point.theta,
            carrierIdx: cIdx,
            waferIdx: wIdx,
            pointIdx: pIdx,
            originalPoint: point,
            trajectory
        });
        }
    }
    }
    
    return allTrajectories;
}, [simulation, selectedPoints]);

const coverageData = useMemo(() => {
    if (!simulation) return null;
    return simulation.computeCoverageAndCrossings();
}, [simulation]);

const cumulativeDistanceData = useMemo(() => {
    if (!simulation) return null;
    return simulation.computeCumulativeDistanceMap(activeCategory, 40);
}, [simulation, activeCategory]);

// Removed unused meshData variable

// 실시간 누적거리 계산
const realTimeDistanceData = useMemo(() => {
    if (!simulation || !multiTrajectoryData) return [];
    
    const data = [];
    const gridSize = 40;
    const radius = simulation.waferRadius;
    const step = (2 * radius) / (gridSize - 1);
    
    for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
        const x = -radius + i * step;
        const y = -radius + j * step;
        const r = Math.sqrt(x * x + y * y);
        
        if (r <= radius) {
        const theta = Math.atan2(y, x);
        let totalDistance = 0;
        let prevPosition = null;
        
        const currentTimeIdx = Math.floor(currentTime / simulation.timeStep);
        
        for (let timeIdx = 0; timeIdx <= currentTimeIdx && timeIdx < simulation.timeArray.length; timeIdx++) {
            const t = simulation.timeArray[timeIdx];
            const position = simulation.getPositionAtTime(t, r, theta, 0, 0)[activeCategory];
            
            if (prevPosition) {
            const dx = position.x - prevPosition.x;
            const dy = position.y - prevPosition.y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
            prevPosition = position;
        }
        
        data.push({
            x: x,
            y: y,
            distance: totalDistance,
            r: r,
            theta: theta
        });
        }
    }
    }
    return data;
}, [simulation, multiTrajectoryData, activeCategory, currentTime]);

const velocityData = useMemo(() => {
    if (!simulation || !multiTrajectoryData) return null;
    return multiTrajectoryData.map(trajData => ({
    ...trajData,
    velocity: simulation.calculateVelocity(trajData.trajectory, activeCategory)
    }));
}, [simulation, multiTrajectoryData, activeCategory]);

const updateAnimation = useCallback(() => {
    if (!isAnimating || !simulation) return;
    
    setCurrentTime(prevTime => {
    const newTime = prevTime + (0.1 * animationSpeed);
    if (newTime >= simulation.totalTime) {
        setIsAnimating(false);
        return 0;
    }
    return newTime;
    });
}, [isAnimating, simulation, animationSpeed]);

useEffect(() => {
    if (isAnimating) {
    const interval = setInterval(updateAnimation, 50);
    return () => clearInterval(interval);
    }
}, [isAnimating, updateAnimation]);

const handleParamChange = (key, value) => {
    setParams(prev => ({
    ...prev,
    [key]: parseFloat(value) || 0
    }));
};

const handlePointChange = (index, key, value) => {
    setSelectedPoints(prev => {
    const newPoints = [...prev];
    newPoints[index] = {
        ...newPoints[index],
        [key]: key === 'name' ? value : parseFloat(value) || 0
    };
    return newPoints;
    });
};

const addPoint = () => {
    setSelectedPoints(prev => [
    ...prev,
    {
        r: 50,
        theta: 0,
        carrierIdx: 0,
        waferIdx: 0,
        name: 'Point ' + (prev.length + 1)
    }
    ]);
};

const removePoint = (index) => {
    setSelectedPoints(prev => prev.filter((_, i) => i !== index));
};

const toggleAnimation = () => {
    setIsAnimating(prev => !prev);
};

const resetAnimation = () => {
    setIsAnimating(false);
    setCurrentTime(0);
};

const getCurrentPositions = () => {
    if (!simulation || !multiTrajectoryData) return [];
    
    return multiTrajectoryData.map(trajData => {
    const position = simulation.getPositionAtTime(currentTime, trajData.r, trajData.theta, trajData.carrierIdx, trajData.waferIdx);
    return {
        ...trajData,
        currentPosition: position[activeCategory]
    };
    });
};

const currentPositions = getCurrentPositions();
const carrierPositions = simulation ? simulation.getTransformedCarrierPositionsAtTime(currentTime, activeCategory) : [];

    if (!simulation || !multiTrajectoryData || !coverageData) {
    return <div className="p-4 text-red-500">Error occurred during simulation initialization.</div>;
    }

const categoryColors = {
    basic: '#2563eb',
    upper: '#16a34a',
    lower: '#dc2626',
    combined: '#7c3aed'
};

const xCrossingsChartData = coverageData.binCenters.map((center, i) => ({
    position: center,
    basic: coverageData.xCrossings.basic[i],
    upper: coverageData.xCrossings.upper[i],
    lower: coverageData.xCrossings.lower[i],
    combined: coverageData.xCrossings.combined[i]
}));

return (
    <div className="p-6 max-w-7xl mx-auto">
    <h1 className="text-3xl font-bold mb-6 text-center">DSP Sliding Simulation</h1>
    
    {/* Control Panel */}
    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow border border-blue-200">
        
        {/* RPM Controls */}
        <div className="mb-2 flex items-center gap-3">
        <div className="w-20 text-sm font-semibold text-blue-700">⚙️ RPM</div>
        <div className="flex-1 grid grid-cols-4 gap-2">
            <div>
            <label className="block text-xs mb-1 text-gray-600">Sun</label>
            <input
                type="number"
                value={params.SUN_RPM}
                onChange={(e) => handleParamChange('SUN_RPM', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="0.1"
            />
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Ring</label>
            <input
                type="number"
                value={params.RING_RPM}
                onChange={(e) => handleParamChange('RING_RPM', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="0.1"
            />
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Upper</label>
            <input
                type="number"
                value={params.UPPER_RPM}
                onChange={(e) => handleParamChange('UPPER_RPM', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="0.1"
            />
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Lower</label>
            <input
                type="number"
                value={params.LOWER_RPM}
                onChange={(e) => handleParamChange('LOWER_RPM', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="0.1"
            />
            </div>
        </div>
        </div>

        {/* System Configuration */}
        <div className="mb-2 flex items-center gap-3">
        <div className="w-20 text-sm font-semibold text-purple-700">🔧 Config</div>
        <div className="flex-1 grid grid-cols-4 gap-2">
            <div>
            <label className="block text-xs mb-1 text-gray-600">Time(s)</label>
            <input
                type="number"
                value={params.TOTAL_TIME}
                onChange={(e) => handleParamChange('TOTAL_TIME', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="1"
                min="1"
            />
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Points</label>
            <input
                type="number"
                value={params.num_points}
                onChange={(e) => handleParamChange('num_points', e.target.value)}
                className="w-full p-1 border rounded text-xs"
                step="1"
                min="5"
            />
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Carrier</label>
            <select
                value={params.num_carriers}
                onChange={(e) => handleParamChange('num_carriers', e.target.value)}
                className="w-full p-1 border rounded text-xs"
            >
                <option value={1}>1</option>
                <option value={5}>5</option>
            </select>
            </div>
            <div>
            <label className="block text-xs mb-1 text-gray-600">Wafer</label>
            <select
                value={params.num_wafers_per_carrier}
                onChange={(e) => handleParamChange('num_wafers_per_carrier', e.target.value)}
                className="w-full p-1 border rounded text-xs"
            >
                <option value={1}>1</option>
                <option value={3}>3</option>
            </select>
            </div>
        </div>
        </div>

        {/* Tracking Points Configuration */}
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-purple-700">📍 Tracking Points Configuration</h3>
            <button
                onClick={addPoint}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
                + Add Point
            </button>
            </div>
            <div className="space-y-2">
            {selectedPoints.map((point, index) => (
                <div key={index} className="grid grid-cols-7 gap-2 items-center p-2 bg-white rounded border">
                <input
                    type="text"
                    value={point.name}
                    onChange={(e) => handlePointChange(index, 'name', e.target.value)}
                    className="p-1 border rounded text-xs"
                    placeholder="Name"
                />
                <div>
                    <label className="text-xs text-gray-500 block">r (mm)</label>
                    <input
                    type="number"
                    value={point.r}
                    onChange={(e) => handlePointChange(index, 'r', e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    step="1"
                    min="0"
                    max={params.WAFER_RADIUS}
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block">θ (rad)</label>
                    <input
                    type="number"
                    value={point.theta}
                    onChange={(e) => handlePointChange(index, 'theta', e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    step="0.1"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 block">Carrier</label>
                    <select
                    value={point.carrierIdx}
                    onChange={(e) => handlePointChange(index, 'carrierIdx', e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    >
                    {Array.from({length: params.num_carriers}, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                    ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500 block">Wafer</label>
                    <select
                    value={point.waferIdx}
                    onChange={(e) => handlePointChange(index, 'waferIdx', e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    >
                    {Array.from({length: params.num_wafers_per_carrier}, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                    ))}
                    </select>
                </div>
                <div className="text-center">
                    <div className="w-4 h-4 rounded-full mx-auto border-2" style={{backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)`}}></div>
                </div>
                <div className="text-center">
                    <button
                    onClick={() => removePoint(index)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    disabled={selectedPoints.length <= 1}
                    >
                    ×
                    </button>
                </div>
                </div>
            ))}
            </div>
        </div>
    </div>
    {/* --- Animation & Trajectory Controls (최적화된 배치) --- */}
    <div className="mb-6 space-y-4">
        {/* Main Controls Row */}
        <div className="flex flex-wrap gap-4 items-center justify-center">
            <button
                onClick={toggleAnimation}
                className={`px-6 py-3 rounded-lg font-bold transition-all text-sm min-w-[120px] ${isAnimating ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'}`}
            >
                {isAnimating ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button
                onClick={resetAnimation}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-all shadow-lg text-sm min-w-[120px]"
            >
                🔄 Reset
            </button>
            <div className="flex flex-col items-center min-w-[200px]">
                <label className="block text-xs mb-1 text-gray-600">Speed: {animationSpeed.toFixed(1)}x</label>
                <input
                    type="range"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div className="flex flex-col items-center min-w-[200px]">
                <label className="block text-xs mb-1 text-gray-600">Time: {currentTime.toFixed(1)}s</label>
                <input
                    type="range"
                    min="0"
                    max={simulation?.totalTime || 500}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>

        {/* Secondary Controls Row */}
        <div className="flex flex-wrap gap-4 items-center justify-center p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={showTrail}
                        onChange={(e) => setShowTrail(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Show Trail</span>
                </label>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Length: {trailLength}</label>
                <input
                    type="range"
                    min="10"
                    max="1000"
                    value={trailLength}
                    onChange={(e) => setTrailLength(parseInt(e.target.value))}
                    className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    disabled={!showTrail}
                />
            </div>
            
            {/* Category Selection */}
            <div className="flex gap-2 flex-wrap justify-center">
                {Object.keys(categoryColors).map(category =>
                <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded font-medium text-sm transition-all ${activeCategory === category ? 'text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    style={{ backgroundColor: activeCategory === category ? categoryColors[category] : undefined }}
                >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
                )}
            </div>
        </div>
    </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
            {[
            { id: 'trajectory', name: 'Real-time Trajectory' },
            { id: 'distance3d', name: '3D Cumulative Distance' },
            { id: 'comparison', name: 'Multi-point Trajectory Comparison' },
            { id: 'xcrossings', name: 'X-Crossings Distribution' },
            { id: 'position', name: 'Position vs Time' },
            { id: 'velocity', name: 'Velocity Profile' },
            { id: 'multiVelocity', name: 'Multi-point Velocity Comparison' }
            ].map(tab =>
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
                {tab.name}
            </button>
            )}
        </div>

        {/* Tab Content */}
        {activeTab === 'trajectory' && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Real-time 2D Trajectory - {activeCategory}</h3>
            <div className="mb-4 text-sm text-gray-600">
                Displaying {multiTrajectoryData ? multiTrajectoryData.length : 0} trajectories
            </div>
            <div className="relative">
                <ResponsiveContainer width="100%" aspect={1} height={500}>
                <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                    type="number"
                    dataKey="x"
                    name="X"
                    unit="mm"
                    domain={[-1200, 1200]}
                    />
                    <YAxis
                    type="number"
                    dataKey="y"
                    name="Y"
                    unit="mm"
                    domain={[-1200, 1200]}
                    />
                    <Tooltip formatter={(value, name) => [value.toFixed(2), name]} />

                    {showTrail && multiTrajectoryData.map((trajData, trajIdx) => {
                    const trajectory = trajData.trajectory[activeCategory];
                    const currentIdx = Math.floor(currentTime / simulation.timeStep);
                    const startIdx = Math.max(0, currentIdx - trailLength);
                    const trailData = trajectory.slice(startIdx, currentIdx + 1);
                    
                    if (trailData.length < 2) return null;
                    
                    const baseHue = trajData.pointIdx * 137.5 % 360;
                    const alpha = 0.5 + (0.5 * trajData.carrierIdx / Math.max(1, simulation.numCarriers - 1));
                    
                    return (
                        <Line
                        key={'trail-' + trajIdx}
                        data={trailData}
                        type="linear"
                        dataKey="y"
                        stroke={`hsla(${baseHue}, 70%, 50%, ${alpha})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                        />
                    );
                    })}

                    <Scatter
                    name="Current Points"
                    data={currentPositions.map(pos => pos.currentPosition)}
                    fill="#ff6b6b"
                    />

                    <Scatter
                    name="Carriers"
                    data={carrierPositions.map(c => ({x: c.x, y: c.y}))}
                    fill="rgba(255, 165, 0, 0.6)"
                    />
                    
                    <Scatter
                    name="Wafers"
                    data={carrierPositions.flatMap(c => c.wafers.map(w => ({x: w.x, y: w.y})))}
                    fill="rgba(0, 100, 255, 0.6)"
                    />
                </ComposedChart>
                </ResponsiveContainer>
                
                <svg 
                className="absolute pointer-events-none"
                style={{
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'scaleY(-1)'
                }}
                viewBox="-2772.5 -1287.5 5445 2475"
                preserveAspectRatio="none"
                >
                <Circle
                    cx={0}
                    cy={0}
                    r={simulation.rSun}
                    fill="rgba(255, 215, 0, 0.2)"
                    stroke="orange"
                    strokeWidth={3}
                />
                <Circle
                    cx={0}
                    cy={0}
                    r={simulation.rInt}
                    fill="none"
                    stroke="red"
                    strokeWidth={3}
                />
                {carrierPositions.map((carrier, cIdx) => (
                    <g key={`carrier-${cIdx}`}>
                    <Circle
                        cx={carrier.x}
                        cy={carrier.y}
                        r={simulation.rCarrier}
                        fill="rgba(255, 165, 0, 0.1)"
                        stroke="orange"
                        strokeWidth={2}
                    />
                    {carrier.wafers.map((wafer, wIdx) => (
                        <Circle
                        key={`wafer-${cIdx}-${wIdx}`}
                        cx={wafer.x}
                        cy={wafer.y}
                        r={simulation.waferRadius}
                        fill="rgba(0, 100, 255, 0.1)"
                        stroke="blue"
                        strokeWidth={2}
                        />
                    ))}
                    </g>
                ))}
                </svg>
            </div>
            </div>
        )}

        {activeTab === 'distance3d' && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">3D Cumulative Distance - {activeCategory}</h3>

            
            <div className="relative">
                <ResponsiveContainer width="100%" aspect={1} height={600}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="X" 
                    unit="mm"
                    domain={[-200, 200]}
                    tickCount={9}
                    />
                    <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Y" 
                    unit="mm"
                    domain={[-200, 200]}
                    tickCount={9}
                    />
                    <Tooltip 
                    formatter={(value, name) => {
                        if (name === 'distance') return [value.toFixed(2) + ' mm', '누적거리'];
                        return [value.toFixed(2), name];
                    }}
                    />
                    
                    <Scatter name="누적거리" data={realTimeDistanceData}>
                    {realTimeDistanceData.map((entry, index) => {
                        const maxDistance = realTimeDistanceData.length ? Math.max(...realTimeDistanceData.map(d => d.distance)) : 1;
                        const minDistance = realTimeDistanceData.length ? Math.min(...realTimeDistanceData.map(d => d.distance)) : 0;
                        const normalized = maxDistance > minDistance ? (entry.distance - minDistance) / (maxDistance - minDistance) : 0;
                        const hue = (1 - normalized) * 240; // Blue(240) to Red(0)
                        
                        return (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(${hue}, 80%, 50%)`}
                            stroke={`hsl(${hue}, 80%, 40%)`}
                            strokeWidth={0.5}
                        />
                        );
                    })}
                    </Scatter>
                </ScatterChart>
                </ResponsiveContainer>
                

            </div>

            {/* Color Bar Legend */}
            <div className="mt-6 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded border border-gray-300"></div>
                <span className="text-sm">Min Distance</span>
                </div>
                <div className="flex-1 h-4 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500 rounded border border-gray-300"></div>
                <div className="flex items-center gap-2">
                <span className="text-sm">Max Distance</span>
                <div className="w-6 h-6 bg-red-500 rounded border border-gray-300"></div>
                </div>
            </div>

            {/* Real-time Statistics */}
            {realTimeDistanceData.length > 0 && (
                <div className="mt-6 flex justify-center gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-blue-700">Min Distance</div>
                    <div className="text-xl font-bold text-blue-600">
                    {Math.min(...realTimeDistanceData.map(d => d.distance)).toFixed(2)} mm
                    </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-green-700">Avg Distance</div>
                    <div className="text-xl font-bold text-green-600">
                    {(realTimeDistanceData.reduce((sum, d) => sum + d.distance, 0) / realTimeDistanceData.length).toFixed(2)} mm
                    </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-orange-700">Max Distance</div>
                    <div className="text-xl font-bold text-orange-600">
                    {Math.max(...realTimeDistanceData.map(d => d.distance)).toFixed(2)} mm
                    </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-purple-700">Data Points</div>
                    <div className="text-xl font-bold text-purple-600">
                    {realTimeDistanceData.length}
                    </div>
                </div>
                </div>
            )}
            
            {/* Time Progress Display */}
            <div className="mt-4 bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Time Progress</span>
                <span className="text-sm text-gray-600">
                    {currentTime.toFixed(1)}s / {simulation?.totalTime || 500}s
                </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-200"
                    style={{ width: `${(currentTime / (simulation?.totalTime || 500)) * 100}%` }}
                ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                Cumulative distance shows total movement distance up to current time
                </div>
            </div>
            </div>
        )}

        {activeTab === 'comparison' && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Multi-point Trajectory Comparison - {activeCategory}</h3>
            <div className="mb-4 text-sm text-gray-600">
                Total {multiTrajectoryData ? multiTrajectoryData.length : 0} trajectories (Points {selectedPoints.length} × Carrier {params.num_carriers} × Wafer {params.num_wafers_per_carrier})
            </div>
            <ResponsiveContainer width="100%" height={500}>
                <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="X" unit="mm" />
                <YAxis dataKey="y" name="Y" unit="mm" />
                <Tooltip />
                <Legend />
                {multiTrajectoryData && multiTrajectoryData.map((trajData, trajIdx) => {
                    const baseHue = trajData.pointIdx * 137.5 % 360;
                    const lightness = 40 + (20 * trajData.carrierIdx / Math.max(1, params.num_carriers - 1));
                    
                    return (
                    <Line
                        key={trajIdx}
                        data={trajData.trajectory[activeCategory]}
                        type="monotone"
                        dataKey="y"
                        stroke={`hsl(${baseHue}, 70%, ${lightness}%)`}
                        name={trajData.name}
                        dot={false}
                        strokeWidth={1.5}
                        opacity={0.7}
                    />
                    );
                })}
                </LineChart>
            </ResponsiveContainer>
            </div>
        )}

        {activeTab === 'xcrossings' && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">X-Crossings Distribution - {activeCategory}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={xCrossingsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="position" name="Position" unit="mm" />
                <YAxis name="Density" />
                <Tooltip />
                <Legend />
                <Bar 
                    dataKey={activeCategory} 
                    fill={categoryColors[activeCategory]} 
                    name={activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} 
                />
                </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6">
                <h4 className="text-md font-semibold mb-4">All Categories Comparison</h4>
                <ResponsiveContainer width="100%" height={400}>
                <BarChart data={xCrossingsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="position" name="Position" unit="mm" />
                    <YAxis name="Density" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="basic" fill={categoryColors.basic} name="Basic" opacity={0.8} />
                    <Bar dataKey="upper" fill={categoryColors.upper} name="Upper" opacity={0.8} />
                    <Bar dataKey="lower" fill={categoryColors.lower} name="Lower" opacity={0.8} />
                    <Bar dataKey="combined" fill={categoryColors.combined} name="Combined" opacity={0.8} />
                </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(categoryColors).map(category => {
                const categoryData = xCrossingsChartData.map(d => d[category]);
                const total = categoryData.reduce((sum, val) => sum + val, 0);
                const max = Math.max(...categoryData);
                const avgPosition = total > 0 ? xCrossingsChartData.reduce((sum, d, i) => sum + d.position * d[category], 0) / total : 0;
                
                return (
                    <div key={category} className="p-3 bg-gray-50 rounded border">
                    <div className="text-sm font-medium" style={{color: categoryColors[category]}}>
                        {category.toUpperCase()}
                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                    <div>Total Density: {total.toFixed(4)}</div>
                    <div>Max Value: {max.toFixed(4)}</div>
                    <div>Avg Position: {avgPosition.toFixed(1)}mm</div>
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        )}

        {activeTab === 'position' && selectedPoints.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Position vs Time - {selectedPoints[0].name}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={multiTrajectoryData[0].trajectory[activeCategory]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" name="Time" unit="s" />
                <YAxis name="Position" unit="mm" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="x" stroke="#8884d8" name="X Position" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="y" stroke="#82ca9d" name="Y Position" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
            </div>
        )}

        {activeTab === 'velocity' && velocityData && selectedPoints.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Velocity Profile - {selectedPoints[0].name}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={velocityData[0].velocity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" name="Time" unit="s" />
                <YAxis name="Velocity" unit="mm/s" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="vx" stroke="#8884d8" name="Vx" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vy" stroke="#82ca9d" name="Vy" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vmag" stroke="#ff7300" name="V magnitude" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
            </div>
        )}

        {activeTab === 'multiVelocity' && velocityData && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Multi-point Velocity Comparison - {activeCategory}</h3>
            <div className="mb-4 text-sm text-gray-600">
                Velocity magnitude comparison for all tracking points
            </div>
            <ResponsiveContainer width="100%" height={500}>
                <LineChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" name="Time" unit="s" />
                <YAxis name="Velocity Magnitude" unit="mm/s" />
                <Tooltip />
                <Legend />
                {velocityData.map((trajData, trajIdx) => {
                    const baseHue = trajData.pointIdx * 137.5 % 360;
                    const lightness = 40 + (20 * trajData.carrierIdx / Math.max(1, params.num_carriers - 1));
                    
                    return (
                    <Line
                        key={trajIdx}
                        data={trajData.velocity}
                        type="monotone"
                        dataKey="vmag"
                        stroke={`hsl(${baseHue}, 70%, ${lightness}%)`}
                        name={trajData.name}
                        dot={false}
                        strokeWidth={1.5}
                        opacity={0.7}
                    />
                    );
                })}
                </LineChart>
            </ResponsiveContainer>
            
            {velocityData.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {velocityData.map((trajData, trajIdx) => {
                    const velocities = trajData.velocity.map(v => v.vmag);
                    const avgVel = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
                    const maxVel = Math.max(...velocities);
                    const minVel = Math.min(...velocities);
                    
                    return (
                    <div key={trajIdx} className="p-3 bg-gray-50 rounded border">
                        <div className="text-sm font-medium text-gray-800">
                        {trajData.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                        <div>Avg: {avgVel.toFixed(2)} mm/s</div>
                        <div>Max: {maxVel.toFixed(2)} mm/s</div>
                        <div>Min: {minVel.toFixed(2)} mm/s</div>
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
            </div>
        )}
        </div>
    );
};

export default UnifiedGearSimulationApp;