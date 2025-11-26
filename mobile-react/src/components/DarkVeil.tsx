import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/theme';

// Helper to convert hex to vec3 string for shader
const hexToVec3 = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`;
};

// Theme colors for injection
const cPrimary = hexToVec3(Colors.primary.main);
const cAccent = hexToVec3(Colors.accent.main);
const cBg = hexToVec3(Colors.background.primary);

const DARK_VEIL_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background-color: #000; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<script type="module">
  import { Renderer, Program, Mesh, Triangle, Vec2 } from 'https://esm.sh/ogl';

  const vertex = \`
    attribute vec2 position;
    void main(){gl_Position=vec4(position,0.0,1.0);}
  \`;

  const fragment = \`
    #ifdef GL_ES
    precision highp float;
    #endif
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uHueShift;
    uniform float uNoise;
    uniform float uScan;
    uniform float uScanFreq;
    uniform float uWarp;
    
    // Theme Colors
    const vec3 cPrimary = ${cPrimary};
    const vec3 cAccent = ${cAccent};
    
    #define iTime uTime
    #define iResolution uResolution

    vec4 buf[8];
    float rand(vec2 c){return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);}

    mat3 rgb2yiq=mat3(0.299,0.587,0.114,0.596,-0.274,-0.322,0.211,-0.523,0.312);
    mat3 yiq2rgb=mat3(1.0,0.956,0.621,1.0,-0.272,-0.647,1.0,-1.106,1.703);

    vec3 hueShiftRGB(vec3 col,float deg){
        vec3 yiq=rgb2yiq*col;
        float rad=radians(deg);
        float cosh=cos(rad),sinh=sin(rad);
        vec3 yiqShift=vec3(yiq.x,yiq.y*cosh-yiq.z*sinh,yiq.y*sinh+yiq.z*cosh);
        return clamp(yiq2rgb*yiqShift,0.0,1.0);
    }

    vec4 sigmoid(vec4 x){return 1./(1.+exp(-x));}

    vec4 cppn_fn(vec2 coordinate,float in0,float in1,float in2){
        // Reduced complexity for better performance and stability, but kept the core pattern structure
        buf[6]=vec4(coordinate.x,coordinate.y,0.3948333106474662+in0,0.36+in1);
        buf[7]=vec4(0.14+in2,sqrt(coordinate.x*coordinate.x+coordinate.y*coordinate.y),0.,0.);
        
        // First layer
        buf[0]=mat4(vec4(6.5404263,-3.6126034,0.7590882,-1.13613),vec4(2.4582713,3.1660357,1.2219609,0.06276096),vec4(-5.478085,-6.159632,1.8701609,-4.7742867),vec4(6.039214,-5.542865,-0.90925294,3.251348))*buf[6] + vec4(0.2,1.1,-1.8,5.0);
        buf[1]=mat4(vec4(-3.3522482,-6.0612736,0.55641043,-4.4719114),vec4(0.8631464,1.7432913,5.643898,1.6106541),vec4(2.4941394,-3.5012043,1.7184316,6.357333),vec4(3.310376,8.209261,1.1355612,-1.165539))*buf[6] + vec4(-5.9,-6.5,-0.8,1.5);
        buf[0]=sigmoid(buf[0]);buf[1]=sigmoid(buf[1]);
        
        // Second layer mixing
        buf[2] = buf[0] * vec4(1.6, 1.3, 2.9, 0.0) + buf[1] * vec4(-0.6, -0.5, -0.9, 0.0);
        buf[2] = sigmoid(buf[2]);
        
        return vec4(buf[2].x, buf[2].y, buf[2].z, 1.0);
    }

    void mainImage(out vec4 fragColor,in vec2 fragCoord){
        vec2 uv=fragCoord/uResolution.xy*2.-1.;
        uv.y*=-1.;
        uv+=uWarp*vec2(sin(uv.y*6.283+uTime*0.5),cos(uv.x*6.283+uTime*0.5))*0.05;
        fragColor=cppn_fn(uv,0.1*sin(0.3*uTime),0.1*sin(0.69*uTime),0.1*sin(0.44*uTime));
    }

    void main(){
        vec4 col; mainImage(col,gl_FragCoord.xy);
        
        // Theme Mapping Logic
        // Use the pattern intensity to mix between Black, Primary, and Accent
        float intensity = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        
        // Start with pure black base
        vec3 targetCol = vec3(0.0);
        
        // Mix in Primary (Turquoise) only at higher intensities, preserving black background
        // smoothstep(0.35, 0.8, ...) means intensity < 0.35 stays black
        targetCol = mix(targetCol, cPrimary, smoothstep(0.35, 0.8, intensity));
        
        // Add Accent (Orange) highlights only at very high intensity
        targetCol = mix(targetCol, cAccent, smoothstep(0.8, 1.0, intensity));
        
        // Apply scanline (subtle darkening)
        float scanline_val = sin(gl_FragCoord.y * uScanFreq) * 0.5 + 0.5;
        targetCol *= 1.0 - (scanline_val * scanline_val) * uScan;
        
        // Apply noise
        targetCol += (rand(gl_FragCoord.xy + uTime) - 0.5) * uNoise;
        
        gl_FragColor = vec4(clamp(targetCol, 0.0, 1.0), 1.0);
    }
  \`;

  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: false
  });
  const gl = renderer.gl;
  document.body.appendChild(gl.canvas);
  
  const geometry = new Triangle(gl);

  // Config values injected
  const config = {
    hueShift: 0,
    noiseIntensity: 0,
    scanlineIntensity: 0,
    speed: 0.5,
    scanlineFrequency: 0,
    warpAmount: 0,
    resolutionScale: 1
  };

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new Vec2() },
      uHueShift: { value: config.hueShift },
      uNoise: { value: config.noiseIntensity },
      uScan: { value: config.scanlineIntensity },
      uScanFreq: { value: config.scanlineFrequency },
      uWarp: { value: config.warpAmount }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w * config.resolutionScale, h * config.resolutionScale);
    program.uniforms.uResolution.value.set(w, h);
  }
  
  window.addEventListener('resize', resize);
  resize();

  const start = performance.now();
  
  function loop() {
    requestAnimationFrame(loop);
    program.uniforms.uTime.value = ((performance.now() - start) / 1000) * config.speed;
    renderer.render({ scene: mesh });
  }
  
  requestAnimationFrame(loop);
</script>
</body>
</html>
`;

interface DarkVeilProps extends ViewProps {
  children?: React.ReactNode;
}

export const DarkVeil: React.FC<DarkVeilProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.backgroundContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: DARK_VEIL_HTML }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          androidHardwareAccelerationDisabled={false}
        />
        {/* Overlay for better text contrast if needed */}
        <View style={styles.overlay} pointerEvents="none" />
      </View>
      
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slight tint for readability
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
});
