import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	Animated,
	Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Award } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../services/api';
import theme from '../theme/tokens';
import { fonts } from '../constants/typography';

export default function BadgesScreen() {
	const [badges, setBadges] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState(null);
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const fetchBadges = async () => {
			try {
				const res = await api.get('/api/gamification/badges/');
				if (res.data.success) {
					setBadges(res.data.data);
				}
			} catch (e) {
				console.error('Failed to fetch badges:', e);
			} finally {
				setLoading(false);
			}
		};
		fetchBadges();
	}, []);

	const earnedCount = badges.filter(b => b.earned).length;

	const openDetail = (badge) => {
		setSelected(badge);
		Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
	};

	const closeDetail = () => {
		Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSelected(null));
	};

	const renderBadge = ({ item }) => {
		const earned = item.earned;
		return (
			<TouchableOpacity
				style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
				onPress={() => openDetail(item)}
				activeOpacity={0.8}
			>
				<View style={[styles.badgeIconWrapper, { borderColor: earned ? item.color_hex : '#444' }]}>
					<Text style={[styles.badgeEmoji, !earned && { opacity: 0.3 }]}>{item.icon}</Text>
					{earned && (
						<View style={[styles.earnedDot, { backgroundColor: item.color_hex }]} />
					)}
				</View>
				<Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
					{earned ? item.name : '???'}
				</Text>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<ArrowLeft color={theme.colors.textPrimary} size={24} />
				</TouchableOpacity>
				<Award size={22} color={theme.colors.primary} />
				<Text style={styles.title}>ACHIEVEMENTS</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Progress Summary */}
			<View style={styles.summaryCard}>
				<View style={styles.summaryLeft}>
					<Text style={styles.summaryCount}>{earnedCount}</Text>
					<Text style={styles.summaryLabel}>of {badges.length} earned</Text>
				</View>
				<View style={styles.progressBarWrapper}>
					<View style={styles.progressBarBg}>
						<Animated.View
							style={[
								styles.progressBarFill,
								{
									width: badges.length > 0
										? `${Math.round((earnedCount / badges.length) * 100)}%`
										: '0%'
								}
							]}
						/>
					</View>
					<Text style={styles.progressPct}>
						{badges.length > 0 ? Math.round((earnedCount / badges.length) * 100) : 0}% Complete
					</Text>
				</View>
			</View>

			{loading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			) : (
				<FlatList
					data={badges}
					keyExtractor={(item) => item.id}
					renderItem={renderBadge}
					numColumns={3}
					contentContainerStyle={styles.grid}
					showsVerticalScrollIndicator={false}
				/>
			)}

			{/* Badge Detail Modal */}
			{selected && (
				<Modal transparent animationType="none" visible={!!selected} onRequestClose={closeDetail}>
					<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeDetail}>
						<Animated.View
							style={[styles.detailCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
						>
							<View style={[styles.detailIconCircle, { borderColor: selected.earned ? selected.color_hex : '#555' }]}>
								<Text style={styles.detailEmoji}>{selected.icon}</Text>
							</View>
							<Text style={[styles.detailName, { color: selected.earned ? selected.color_hex : theme.colors.textMuted }]}>
								{selected.earned ? selected.name : 'LOCKED'}
							</Text>
							<Text style={styles.detailDesc}>
								{selected.earned ? selected.description : 'Keep exploring the campus to unlock this badge.'}
							</Text>
							{selected.earned && (
								<View style={[styles.earnedBadgePill, { backgroundColor: `${selected.color_hex}22`, borderColor: selected.color_hex }]}>
									<Text style={[styles.earnedPillText, { color: selected.color_hex }]}>✓ EARNED</Text>
								</View>
							)}
							<TouchableOpacity style={styles.closeBtn} onPress={closeDetail}>
								<Text style={styles.closeBtnText}>CLOSE</Text>
							</TouchableOpacity>
						</Animated.View>
					</TouchableOpacity>
				</Modal>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.bgPrimary,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 15,
		paddingHorizontal: 20,
		backgroundColor: theme.colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	backButton: {
		padding: 5,
	},
	title: {
		fontFamily: fonts.heading.bold,
		flex: 1,
		fontSize: 18,
		fontWeight: '900',
		color: theme.colors.primary,
		marginLeft: 10,
		letterSpacing: 2,
	},
	summaryCard: {
		flexDirection: 'row',
		alignItems: 'center',
		margin: 16,
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.md,
		padding: 16,
		borderWidth: 1,
		borderColor: theme.colors.border,
		gap: 16,
	},
	summaryLeft: {
		alignItems: 'center',
	},
	summaryCount: {
		fontFamily: fonts.hud.bold,
		fontSize: 32,
		fontWeight: '900',
		color: theme.colors.primary,
		lineHeight: 36,
	},
	summaryLabel: {
		fontSize: 11,
		color: theme.colors.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	progressBarWrapper: {
		flex: 1,
	},
	progressBarBg: {
		height: 8,
		backgroundColor: theme.colors.bgSecondary,
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 6,
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: theme.colors.primary,
		borderRadius: 4,
	},
	progressPct: {
		fontSize: 12,
		color: theme.colors.textSecondary,
		fontWeight: '600',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	grid: {
		paddingHorizontal: 12,
		paddingBottom: 40,
	},
	badgeCard: {
		flex: 1,
		margin: 6,
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.md,
		paddingVertical: 16,
		paddingHorizontal: 8,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	badgeCardLocked: {
		opacity: 0.6,
	},
	badgeIconWrapper: {
		width: 60,
		height: 60,
		borderRadius: 30,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		position: 'relative',
	},
	badgeEmoji: {
		fontSize: 28,
	},
	earnedDot: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 2,
		borderColor: theme.colors.surface,
	},
	badgeName: {
		fontSize: 11,
		fontWeight: 'bold',
		color: theme.colors.textPrimary,
		textAlign: 'center',
		letterSpacing: 0.5,
	},
	badgeNameLocked: {
		color: theme.colors.textMuted,
	},
	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	detailCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radius.lg,
		padding: 28,
		alignItems: 'center',
		width: '100%',
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	detailIconCircle: {
		width: 88,
		height: 88,
		borderRadius: 44,
		borderWidth: 3,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	detailEmoji: {
		fontSize: 44,
	},
	detailName: {
		fontFamily: fonts.heading.bold,
		fontSize: 20,
		fontWeight: '900',
		letterSpacing: 1,
		marginBottom: 8,
		textAlign: 'center',
	},
	detailDesc: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 20,
	},
	earnedBadgePill: {
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1,
		marginBottom: 20,
	},
	earnedPillText: {
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 1,
	},
	closeBtn: {
		backgroundColor: theme.colors.bgSecondary,
		paddingVertical: 10,
		paddingHorizontal: 32,
		borderRadius: theme.radius.md,
	},
	closeBtnText: {
		color: theme.colors.textMuted,
		fontWeight: 'bold',
		letterSpacing: 1,
		fontSize: 13,
	},
});
