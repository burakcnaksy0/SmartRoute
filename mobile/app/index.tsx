import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Animated,
    Dimensions,
    Easing,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ThreeDCompass } from '@/components/ThreeDCompass';

const { width } = Dimensions.get('window');
const C = Colors.light;

// Vibrant color palette for dynamic styling
const VIBRANT = {
    blue: '#3B82F6',
    purple: '#8B5CF6',
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    cyan: '#06B6D4',
};

const MAP_W = 1200;
const MAP_H = 1600;

const Pin = ({ top, left, anim, color = VIBRANT.rose }: { top: number, left: number, anim: Animated.Value, color?: string }) => (
    <Animated.View style={[styles.pinContainer, {
        top: top - 40,
        left: left - 15,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }]
    }]}>
        <View style={styles.pinShadow3d} />
        <View style={[styles.pinHead, { backgroundColor: color }]}>
            <View style={styles.pinGloss} />
            <View style={styles.pinDot}><MaterialIcons name="navigation" size={11} color={color} /></View>
        </View>
        <View style={[styles.pinTail3d, { backgroundColor: color }]} />
        <View style={[styles.pinTail, { backgroundColor: color }]} />
    </Animated.View>
);

const StartDot = ({ top, left }: { top: number, left: number }) => (
    <View style={[styles.startDotContainer, { top: top - 8, left: left - 8 }]}>
        <View style={styles.startDotShadow} />
        <View style={[styles.startDotCore, { backgroundColor: VIBRANT.emerald }]} />
        <View style={[styles.startDotRing, { borderColor: VIBRANT.emerald }]} />
    </View>
);

const CAR_LAYERS = [
    // Lower Chassis
    { id: 1, type: 'body', color: '#1E3A8A', z: 1, hasWheels: true },
    { id: 2, type: 'body', color: '#1E3A8A', z: 2, hasWheels: true },
    { id: 3, type: 'body', color: '#1D4ED8', z: 3, hasWheels: true },
    { id: 4, type: 'body', color: '#1D4ED8', z: 4, hasWheels: true },
    // Main Body
    { id: 5, type: 'body', color: '#2563EB', z: 5 },
    { id: 6, type: 'body', color: '#2563EB', z: 6 },
    { id: 7, type: 'body', color: '#2563EB', z: 7 },
    { id: 8, type: 'body', color: '#3B82F6', z: 8 },
    { id: 9, type: 'body', color: '#3B82F6', z: 9 },
    { id: 10, type: 'body', color: '#60A5FA', z: 10 },
    // Top Body (Lights)
    { id: 11, type: 'body-lights', color: '#60A5FA', z: 11 },
    // Windows / Cabin
    { id: 12, type: 'roof', color: '#0F172A', z: 12 },
    { id: 13, type: 'roof', color: '#0F172A', z: 13 },
    { id: 14, type: 'roof', color: '#1E293B', z: 14 },
    { id: 15, type: 'roof', color: '#334155', z: 15 },
    // Roof Top
    { id: 16, type: 'roof', color: '#3B82F6', z: 16 },
    { id: 17, type: 'roof', color: '#60A5FA', z: 17 },
    { id: 18, type: 'roof', color: '#93C5FD', z: 18 },
    { id: 19, type: 'roof', color: '#BFDBFE', z: 19 },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const journey = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const pinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const puckOpacity = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Intro animations
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        ]).start();

        // Logical journey navigation sequence (A to B)
        const driveLoop = Animated.loop(
            Animated.sequence([
                // Fade in puck at start
                Animated.timing(puckOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.delay(600),
                // Drive to destination (triggers X, Y, Rot, and Map pan via interpolation)
                Animated.timing(journey, { toValue: 100, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
                // Wait at destination red target
                Animated.delay(2000),
                // Fade out
                Animated.timing(puckOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.delay(300),
                // Reset instantly while hidden
                Animated.timing(journey, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );

        // Puck pulsing
        const pulseLoop = Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        );

        // Pin bobbing
        const pinLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pinAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pinAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );

        // 3D Car suspension bounce
        const bounceLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: 3, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ])
        );

        driveLoop.start();
        pulseLoop.start();
        pinLoop.start();
        bounceLoop.start();

        return () => {
            driveLoop.stop();
            pulseLoop.stop();
            pinLoop.stop();
            bounceLoop.stop();
        };
    }, [fadeAnim, slideAnim, journey, pulseAnim, pinAnim, puckOpacity]);

    // Interpolations for logical movement
    const puckXInt = journey.interpolate({
        inputRange: [0, 35, 40, 75, 80, 100],
        outputRange: [0, 0, 0, 400, 400, 400]
    });
    const puckYInt = journey.interpolate({
        inputRange: [0, 35, 40, 75, 80, 100],
        outputRange: [0, -400, -400, -400, -400, -600]
    });
    const puckRotInt = journey.interpolate({
        inputRange: [0, 35, 40, 75, 80, 100],
        outputRange: ['0deg', '0deg', '90deg', '90deg', '0deg', '0deg']
    });

    return (
        <View style={styles.root}>
            <StatusBar style="dark" />

            {/* ISOMETRIC MAP BACKGROUND */}
            <View style={styles.mapViewport} pointerEvents="none">

                <Animated.View style={[styles.mapPlane, {
                    transform: [
                        { perspective: 1000 },
                        { rotateX: '65deg' },
                        { rotateZ: '45deg' },
                        // Map pans oppositely to keep the puck centered in view
                        { translateX: journey.interpolate({ inputRange: [0, 100], outputRange: [0, -180] }) },
                        { translateY: journey.interpolate({ inputRange: [0, 100], outputRange: [0, 300] }) }
                    ]
                }]}>
                    {/* Grid Lines */}
                    <View style={StyleSheet.absoluteFill}>
                        {Array.from({ length: 25 }).map((_, i) => (
                            <View key={`h-${i}`} style={[styles.gridLineH, { top: i * 100 }]} />
                        ))}
                        {Array.from({ length: 15 }).map((_, i) => (
                            <View key={`v-${i}`} style={[styles.gridLineV, { left: i * 100 }]} />
                        ))}
                    </View>

                    {/* Zoning blocks (Buildings/Areas) */}
                    <View style={[styles.zone, { top: 900, left: 100, width: 250, height: 180, backgroundColor: VIBRANT.purple }]} />
                    <View style={[styles.zone, { top: 700, left: 550, width: 200, height: 250, backgroundColor: VIBRANT.blue }]} />
                    <View style={[styles.zone, { top: 400, left: 250, width: 300, height: 200, backgroundColor: VIBRANT.amber }]} />
                    <View style={[styles.zone, { top: 100, left: 850, width: 220, height: 180, backgroundColor: VIBRANT.cyan }]} />

                    {/* Background Decorative Routes & Pins */}
                    <View style={[styles.routeBranch, { top: 800, left: 400, width: 200, height: 6 }]} />
                    <View style={[styles.routeBranch, { top: 800, left: 600, width: 6, height: 150 }]} />
                    <Pin top={950} left={600} anim={pinAnim} color={VIBRANT.cyan} />

                    <View style={[styles.routeBranch, { top: 500, left: 150, width: 250, height: 6 }]} />
                    <Pin top={500} left={150} anim={pinAnim} color={VIBRANT.purple} />

                    {/* MAIN ACTIVE ROUTE PATH with Glow */}
                    {/* Seg 1 (UP): Start -> Turn 1 */}
                    <View style={[styles.routePathGlow, { top: 600, left: 400 - 8, width: 16, height: 404 }]} />
                    <View style={[styles.routePath, { top: 600, left: 400 - 4, width: 8, height: 404 }]} />

                    {/* Seg 2 (RIGHT): Turn 1 -> Turn 2 */}
                    <View style={[styles.routePathGlow, { top: 600 - 8, left: 400 - 8, width: 416, height: 16 }]} />
                    <View style={[styles.routePath, { top: 600 - 4, left: 400 - 4, width: 408, height: 8 }]} />

                    {/* Seg 3 (UP): Turn 2 -> Target */}
                    <View style={[styles.routePathGlow, { top: 400, left: 800 - 8, width: 16, height: 204 }]} />
                    <View style={[styles.routePath, { top: 400, left: 800 - 4, width: 8, height: 204 }]} />

                    {/* Start Dot */}
                    <StartDot top={1000} left={400} />

                    {/* Destination Target Pin */}
                    <Pin top={400} left={800} anim={pinAnim} color={VIBRANT.rose} />

                    {/* Dynamic User Puck */}
                    <Animated.View style={[styles.puckContainer, {
                        top: 1000 - 36, // Start exactly on the start dot
                        left: 400 - 36,
                        opacity: puckOpacity,
                        transform: [
                            { translateX: puckXInt },
                            { translateY: puckYInt },
                        ]
                    }]}>
                        {/* 1. Radar Pulse (on the floor) */}
                        <Animated.View style={[styles.puckPulse, {
                            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                            opacity: pulseAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 0, 0] })
                        }]} />

                        {/* 2. Shadow (on the floor) */}
                        <Animated.View style={[styles.carBody, { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.2)', transform: [{ translateX: 16 }, { translateY: 16 }, { rotate: puckRotInt }] }]} />

                        {/* 3. Bouncing, extruded 3D car */}
                        <Animated.View style={{
                            position: 'absolute', width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
                            transform: [
                                { perspective: 700 },
                                { rotateX: '8deg' },
                                { translateX: Animated.multiply(bounceAnim, -1) },
                                { translateY: Animated.multiply(bounceAnim, -1) }
                            ]
                        }}>
                            {/* Voxel Layers */}
                            {CAR_LAYERS.map(layer => {
                                const isLights = layer.type === 'body-lights';
                                const styleType = layer.type.includes('body') ? styles.carBody : styles.carRoof;

                                return (
                                    <Animated.View key={layer.id} style={[
                                        styleType,
                                        {
                                            position: 'absolute',
                                            backgroundColor: layer.color,
                                            transform: [
                                                { translateX: -layer.z },
                                                { translateY: -layer.z },
                                                { rotate: puckRotInt }
                                            ],
                                            overflow: isLights ? 'hidden' : 'visible'
                                        }
                                    ]}>
                                        {layer.hasWheels && (
                                            <>
                                                <View style={styles.wheelFrontLeft} />
                                                <View style={styles.wheelFrontRight} />
                                                <View style={styles.wheelRearLeft} />
                                                <View style={styles.wheelRearRight} />
                                            </>
                                        )}
                                        {isLights && (
                                            <>
                                                <View style={styles.headlightLeft} />
                                                <View style={styles.headlightRight} />
                                                <View style={styles.taillightLeft} />
                                                <View style={styles.taillightRight} />
                                            </>
                                        )}
                                    </Animated.View>
                                );
                            })}
                            <View style={styles.carGlassFront} />
                            <View style={styles.carGlassSide} />
                            <View style={styles.carHighlight} />
                        </Animated.View>
                    </Animated.View>

                </Animated.View>
            </View>

            {/* FOREGROUND UI */}
            <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">

                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoBadge}>
                        <ThreeDCompass />
                        <Text style={styles.appName}>SmartRoute</Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.bottomCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.featureTags}>
                        <View style={styles.tag}>
                            <View style={[styles.liveDot, { backgroundColor: VIBRANT.emerald }]} />
                            <Text style={styles.tagText}>Canlı Navigasyon</Text>
                        </View>
                        <View style={styles.tag}>
                            <MaterialIcons name="auto-awesome" size={16} color={VIBRANT.amber} />
                            <Text style={styles.tagText}>Yapay Zeka Destekli</Text>
                        </View>
                    </View>

                    <Text style={styles.headline}>
                        Akıllı Rotalar,{'\n'}Kusursuz Yolculuk.
                    </Text>
                    <Text style={styles.subheadline}>
                        Çok duraklı rotalarınızı saniyeler içinde optimize edin. Zaman ve yakıt tasarrufu ile yola çıkın.
                    </Text>

                    <View style={styles.actionGroup}>
                        <Button
                            label="Rotanı Oluştur"
                            variant="primary"
                            size="lg"
                            fullWidth
                            onPress={() => router.push('/(auth)/register')}
                        />
                        <Button
                            label="Hesabım Var"
                            variant="outline"
                            size="lg"
                            fullWidth
                            onPress={() => router.push('/(auth)/login')}
                        />
                    </View>
                </Animated.View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.background,
    },
    mapViewport: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        backgroundColor: C.surfaceContainerLow || '#F8FAFC',
    },
    mapPlane: {
        width: MAP_W,
        height: MAP_H,
        position: 'absolute',
        top: '30%', // Shifted map center much higher
        left: '50%',
        marginTop: -MAP_H / 2,
        marginLeft: -MAP_W / 2,
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: VIBRANT.blue,
        opacity: 0.12,
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: VIBRANT.blue,
        opacity: 0.12,
    },
    zone: {
        position: 'absolute',
        backgroundColor: VIBRANT.blue, // Default if overridden
        opacity: 0.08,
        borderRadius: Rounded.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    routePathGlow: {
        position: 'absolute',
        backgroundColor: C.primary,
        opacity: 0.2,
        borderRadius: 8,
    },
    routePath: {
        position: 'absolute',
        backgroundColor: C.primary,
        borderRadius: 4,
        ...Shadow.sm,
    },
    routeBranch: {
        position: 'absolute',
        backgroundColor: VIBRANT.cyan,
        opacity: 0.25,
        borderRadius: 3,
    },
    puckContainer: {
        position: 'absolute',
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    puckPulse: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: VIBRANT.cyan,
    },
    carBody: {
        width: 24,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        ...Shadow.md,
    },
    carRoof: {
        width: 18,
        height: 28,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
    },
    carGlassFront: {
        position: 'absolute',
        top: 20,
        width: 14,
        height: 9,
        borderRadius: 3,
        backgroundColor: 'rgba(186,230,253,0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.75)',
        transform: [{ rotateX: '14deg' }],
    },
    carGlassSide: {
        position: 'absolute',
        top: 30,
        left: 25,
        width: 5,
        height: 12,
        borderRadius: 2,
        backgroundColor: 'rgba(125,211,252,0.7)',
        transform: [{ skewY: '-18deg' }],
    },
    carHighlight: {
        position: 'absolute',
        top: 13,
        left: 25,
        width: 4,
        height: 34,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.28)',
    },
    headlightLeft: {
        position: 'absolute', top: 3, left: 3, width: 6, height: 4, backgroundColor: '#FEF08A', borderRadius: 2
    },
    headlightRight: {
        position: 'absolute', top: 3, right: 3, width: 6, height: 4, backgroundColor: '#FEF08A', borderRadius: 2
    },
    taillightLeft: {
        position: 'absolute', bottom: 3, left: 3, width: 6, height: 3, backgroundColor: '#F87171', borderRadius: 2
    },
    taillightRight: {
        position: 'absolute', bottom: 3, right: 3, width: 6, height: 3, backgroundColor: '#F87171', borderRadius: 2
    },
    wheelFrontLeft: {
        position: 'absolute', top: 7, left: -3, width: 6, height: 10, backgroundColor: '#18181B', borderRadius: 4
    },
    wheelFrontRight: {
        position: 'absolute', top: 7, right: -3, width: 6, height: 10, backgroundColor: '#18181B', borderRadius: 4
    },
    wheelRearLeft: {
        position: 'absolute', bottom: 7, left: -3, width: 6, height: 10, backgroundColor: '#18181B', borderRadius: 4
    },
    wheelRearRight: {
        position: 'absolute', bottom: 7, right: -3, width: 6, height: 10, backgroundColor: '#18181B', borderRadius: 4
    },
    pinContainer: {
        position: 'absolute',
        width: 30,
        height: 40,
        alignItems: 'center',
    },
    pinHead: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.7)',
        ...Shadow.md,
    },
    pinGloss: {
        position: 'absolute',
        top: 3,
        left: 5,
        width: 8,
        height: 5,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.72)',
        transform: [{ rotate: '-25deg' }],
    },
    pinDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: C.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinShadow3d: {
        position: 'absolute',
        bottom: -2,
        width: 24,
        height: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(15,23,42,0.22)',
        transform: [{ scaleX: 1.15 }],
    },
    pinTail3d: {
        position: 'absolute',
        bottom: 0,
        width: 10,
        height: 10,
        transform: [{ rotate: '45deg' }],
        zIndex: -1,
        opacity: 0.75,
    },
    pinTail: {
        width: 6,
        height: 12,
        marginTop: -7,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        opacity: 0.95,
    },
    startDotContainer: {
        position: 'absolute',
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startDotCore: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: C.surface,
        ...Shadow.sm,
    },
    startDotShadow: {
        position: 'absolute',
        bottom: -4,
        width: 18,
        height: 6,
        borderRadius: 9,
        backgroundColor: 'rgba(15,23,42,0.2)',
    },
    startDotRing: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        opacity: 0.5,
    },
    uiContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    logoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        backgroundColor: C.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: Rounded.full,
        ...Shadow.sm,
    },
    appName: {
        ...Typography.titleMedium,
        fontWeight: '800',
        color: C.text,
        letterSpacing: 0.5,
    },
    bottomCard: {
        backgroundColor: C.surface,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.xl + Spacing.md,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        ...Shadow.xl,
        marginTop: 'auto',
    },
    featureTags: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
        marginBottom: Spacing.md,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.primaryFixed,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Rounded.full,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    tagText: {
        ...Typography.caption,
        fontWeight: '700',
        color: C.primary,
        letterSpacing: 0.3,
    },
    headline: {
        ...Typography.display,
        fontSize: 34,
        lineHeight: 42,
        fontWeight: '900',
        color: C.text,
        marginBottom: Spacing.sm,
    },
    subheadline: {
        ...Typography.bodyLarge,
        color: C.textSecondary,
        lineHeight: 26,
        marginBottom: Spacing.xl,
    },
    actionGroup: {
        gap: Spacing.md,
    },
});
