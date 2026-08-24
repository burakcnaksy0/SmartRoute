import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Animated,
    Dimensions,
    Easing,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');
const C = Colors.light;

const MAP_W = 1200;
const MAP_H = 1600;

const Pin = ({ top, left, anim, color = C.error }: { top: number, left: number, anim: Animated.Value, color?: string }) => (
    <Animated.View style={[styles.pinContainer, { 
        top: top - 40, 
        left: left - 15,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] 
    }]}>
        <View style={[styles.pinHead, { backgroundColor: color }]}>
            <View style={styles.pinDot} />
        </View>
        <View style={[styles.pinTail, { backgroundColor: color }]} />
    </Animated.View>
);

const StartDot = ({ top, left }: { top: number, left: number }) => (
    <View style={[styles.startDotContainer, { top: top - 8, left: left - 8 }]}>
        <View style={styles.startDotCore} />
        <View style={styles.startDotRing} />
    </View>
);

export default function WelcomeScreen() {
    const router = useRouter();
    const journey = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const pinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const puckOpacity = useRef(new Animated.Value(0)).current;

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

        driveLoop.start();
        pulseLoop.start();
        pinLoop.start();

        return () => {
            driveLoop.stop();
            pulseLoop.stop();
            pinLoop.stop();
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
                {/* Atmospheric glow */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

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
                    <View style={[styles.zone, { top: 900, left: 100, width: 250, height: 180 }]} />
                    <View style={[styles.zone, { top: 700, left: 550, width: 200, height: 250 }]} />
                    <View style={[styles.zone, { top: 400, left: 250, width: 300, height: 200 }]} />
                    <View style={[styles.zone, { top: 100, left: 850, width: 220, height: 180 }]} />

                    {/* Background Decorative Routes & Pins */}
                    <View style={[styles.routeBranch, { top: 800, left: 400, width: 200, height: 6 }]} />
                    <View style={[styles.routeBranch, { top: 800, left: 600, width: 6, height: 150 }]} />
                    <Pin top={950} left={600} anim={pinAnim} color={C.outline} />

                    <View style={[styles.routeBranch, { top: 500, left: 150, width: 250, height: 6 }]} />
                    <Pin top={500} left={150} anim={pinAnim} color={C.outline} />

                    {/* MAIN ACTIVE ROUTE PATH */}
                    {/* Seg 1 (UP): Start -> Turn 1 */}
                    <View style={[styles.routePath, { top: 600, left: 400 - 4, width: 8, height: 404 }]} />
                    {/* Seg 2 (RIGHT): Turn 1 -> Turn 2 */}
                    <View style={[styles.routePath, { top: 600 - 4, left: 400 - 4, width: 408, height: 8 }]} />
                    {/* Seg 3 (UP): Turn 2 -> Target */}
                    <View style={[styles.routePath, { top: 400, left: 800 - 4, width: 8, height: 204 }]} />

                    {/* Start Dot */}
                    <StartDot top={1000} left={400} />

                    {/* Destination Target Pin */}
                    <Pin top={400} left={800} anim={pinAnim} color={C.error} />

                    {/* Dynamic User Puck */}
                    <Animated.View style={[styles.puckContainer, {
                        top: 1000 - 24, // Start exactly on the start dot
                        left: 400 - 24,
                        opacity: puckOpacity,
                        transform: [
                            { translateX: puckXInt },
                            { translateY: puckYInt },
                        ]
                    }]}>
                        <Animated.View style={[styles.puckPulse, {
                            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                            opacity: pulseAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 0, 0] })
                        }]} />
                        <Animated.View style={[styles.puckCore, {
                            transform: [{ rotate: puckRotInt }]
                        }]}>
                            <MaterialIcons name="navigation" size={20} color={C.surface} />
                        </Animated.View>
                    </Animated.View>

                </Animated.View>
            </View>

            {/* FOREGROUND UI */}
            <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
                
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.logoBadge}>
                        <MaterialIcons name="explore" size={22} color={C.primary} />
                        <Text style={styles.appName}>SmartRoute</Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.bottomCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.featureTags}>
                        <View style={styles.tag}>
                            <View style={styles.liveDot} />
                            <Text style={styles.tagText}>Canlı Navigasyon</Text>
                        </View>
                        <View style={styles.tag}>
                            <MaterialIcons name="auto-awesome" size={14} color={C.primary} />
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
    glowTop: {
        position: 'absolute',
        top: -150,
        left: -100,
        width: width + 200,
        height: 350,
        backgroundColor: C.primaryFixed,
        opacity: 0.4,
        borderRadius: 200,
        transform: [{ scaleX: 1.5 }],
    },
    glowBottom: {
        position: 'absolute',
        bottom: height * 0.3,
        right: -100,
        width: 350,
        height: 350,
        backgroundColor: C.secondaryContainer,
        opacity: 0.3,
        borderRadius: 200,
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
        backgroundColor: C.outlineVariant,
        opacity: 0.35,
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: C.outlineVariant,
        opacity: 0.35,
    },
    zone: {
        position: 'absolute',
        backgroundColor: C.primary,
        opacity: 0.04,
        borderRadius: Rounded.xl,
    },
    routePath: {
        position: 'absolute',
        backgroundColor: C.primary,
        borderRadius: 4,
        ...Shadow.sm,
    },
    routeBranch: {
        position: 'absolute',
        backgroundColor: C.outline,
        opacity: 0.3,
        borderRadius: 3,
    },
    puckContainer: {
        position: 'absolute',
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    puckPulse: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: C.primary,
    },
    puckCore: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: C.surface,
        ...Shadow.lg,
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
        ...Shadow.md,
    },
    pinDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: C.surface,
    },
    pinTail: {
        width: 4,
        height: 14,
        marginTop: -4,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
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
        backgroundColor: C.primary,
    },
    startDotRing: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: C.primary,
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
        backgroundColor: C.primary,
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
