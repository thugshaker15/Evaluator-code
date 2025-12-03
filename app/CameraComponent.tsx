import React, { useState, useEffect } from 'react';

import { View, TouchableOpacity, Modal, Text, ScrollView, Button, TextInput } from 'react-native';

import { requireNativeViewManager } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './CameraComponentStyles';

const CameraxView = requireNativeViewManager('Camerax');

interface SummaryData {
  heightBreakdown?: {
    Top?: number;
    Middle?: number;
    Bottom?: number;
    Unknown?: number;
  };
  angleBreakdown?: {
    Correct?: number;
    Wrong?: number;
    Unknown?: number;
  };
  handPresenceBreakdown?: {
    Detected?: number;
    None?: number;
  };
  handPostureBreakdown?: {
    Correct?: number;
    Supination?: number;
    'Too much pronation'?: number;
    Unknown?: number;
  };
  posePresenceBreakdown?: {
    Detected?: number;
    None?: number;
  };
  elbowPostureBreakdown?: {
    Correct?: number;
    'Low elbow'?: number;
    'Elbow too high'?: number;
    Unknown?: number;
  };
  userId?: string;
  timestamp?: string;
  sessionDuration?: string;
}

const CameraComponent = ({ startDelay, onClose }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDetectionEnabled, setIsDetectionEnabled] = useState(false);
  const [lensType, setLensType] = useState('back'); // use front or back camera
  const [userId, setUserId] = useState('default_user');
  const [showSetupOverlay, setShowSetupOverlay] = useState(true);

  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [maxAngle, setMaxAngle] = useState(15);
  
  // Settings modal state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempMaxAngle, setTempMaxAngle] = useState(15);

  // Total playing time
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

    // state for session history + "view more" detail modal ===
  const [sessionHistory, setSessionHistory] = useState<SummaryData[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedDetailSection, setSelectedDetailSection] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCameraActive(true);
    }, startDelay || 100);

    return () => clearTimeout(timer);
  }, []);

  const toggleCamera = () => {
    setLensType(prev => prev === 'back' ? 'front' : 'back');
  };

  const handleReady = () => {
    setShowSetupOverlay(false);
  };

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) {
          setUserId(email);
          console.log('User ID loaded for camera:', email);
        } else {
          console.warn('No user email found, using default');
        }
      } catch (error) {
        console.error('Error loading user ID:', error);
      }
    };
    loadUserId();
  }, []);

  const handleSessionEnd = (event: any) => {
    const {
      heightBreakdown,
      angleBreakdown,
      handPresenceBreakdown,
      handPostureBreakdown,
      posePresenceBreakdown,
      elbowPostureBreakdown,
      userId: eventUserId,
      timestamp
    } = event.nativeEvent;

    let finalDuration = "0s";
    if (sessionStartTime) {
      const endTime = new Date();
      const diffMs = endTime.getTime() - sessionStartTime.getTime();
      finalDuration = formatDuration(diffMs);
    }

    const newSummaryData = {
      heightBreakdown,
      angleBreakdown,
      handPresenceBreakdown,
      handPostureBreakdown,
      posePresenceBreakdown,
      elbowPostureBreakdown,
      userId: eventUserId,
      timestamp,
      sessionDuration: finalDuration,
    };

    setSummaryData(newSummaryData);
    setSummaryVisible(true);

    // also store this session in local history
    setSessionHistory(prev => [newSummaryData, ...prev].slice(0, 20));

  };

  const closeSummary = () => {
    setSummaryVisible(false);
    setSummaryData(null);
  };

  const openSettings = () => {
    setTempMaxAngle(maxAngle);
    setSettingsVisible(true);
  };

  const closeSettings = () => {
    setSettingsVisible(false);
  };

  const saveSettings = () => {
    setMaxAngle(tempMaxAngle);
    setSettingsVisible(false);
  };

    // helpers for history and detail modals ===
  const openHistory = () => setHistoryVisible(true);
  const closeHistory = () => setHistoryVisible(false);

  const openDetail = (sectionKey: string) => {
    setSelectedDetailSection(sectionKey);
  };

  const closeDetail = () => setSelectedDetailSection(null);

  let formattedTimestamp = "";

  if (summaryData?.timestamp) {
    const dt = new Date(summaryData.timestamp.replace(" ", "T"));

    const weekday = dt.toLocaleString([], { weekday: "short" });
    const date = dt.toLocaleDateString("en-CA");
    const time = dt.toLocaleString([], { hour: "numeric", minute: "2-digit" });

    formattedTimestamp = `${weekday}, ${date}, ${time}`;
  }

  function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  // normalized metric values for consistent percentages in UI ===
  const heightTopRaw = summaryData?.heightBreakdown?.Top ?? 0;
  const heightMiddleRaw = summaryData?.heightBreakdown?.Middle ?? 0;
  const heightBottomRaw = summaryData?.heightBreakdown?.Bottom ?? 0;
  const [heightTopPct, heightMiddlePct, heightBottomPct] = normalizePercentages([
    heightTopRaw,
    heightMiddleRaw,
    heightBottomRaw,
  ]);

  const angleCorrectRaw = summaryData?.angleBreakdown?.Correct ?? 0;
  const angleWrongRaw = summaryData?.angleBreakdown?.Wrong ?? 0;
  const [angleCorrectPct, angleWrongPct] = normalizePercentages([
    angleCorrectRaw,
    angleWrongRaw,
  ]);

  const handCorrectRaw = summaryData?.handPostureBreakdown?.Correct ?? 0;
  const handSupinationRaw = summaryData?.handPostureBreakdown?.Supination ?? 0;
  const handTooMuchRaw =
    summaryData?.handPostureBreakdown?.['Too much pronation'] ?? 0;
  const [handCorrectPct, handSupinationPct, handTooMuchPct] =
    normalizePercentages([
      handCorrectRaw,
      handSupinationRaw,
      handTooMuchRaw,
    ]);

  const elbowCorrectRaw = summaryData?.elbowPostureBreakdown?.Correct ?? 0;
  const elbowLowRaw =
    summaryData?.elbowPostureBreakdown?.['Low elbow'] ?? 0;
  const elbowHighRaw =
    summaryData?.elbowPostureBreakdown?.['Elbow too high'] ?? 0;
  const [elbowCorrectPct, elbowLowPct, elbowHighPct] = normalizePercentages([
    elbowCorrectRaw,
    elbowLowRaw,
    elbowHighRaw,
  ]);

  return (
    <View style={styles.container}>
      {/* Summary Modal */}
      <Modal visible={summaryVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.title}>Session Summary</Text>

              {summaryData ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bow Height</Text>
                    <Text>Top: {summaryData.heightBreakdown?.Top?.toFixed(1) || 0}%</Text>
                    <Text>Middle: {summaryData.heightBreakdown?.Middle?.toFixed(1) || 0}%</Text>
                    <Text>Bottom: {summaryData.heightBreakdown?.Bottom?.toFixed(1) || 0}%</Text>

                    
                    {/* icon + normalized breakdown for Bow Height === */}
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Top</Text>
                      <Text style={styles.metricPercent}>
                        {heightTopPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotGood} />
                      <Text style={styles.metricLabel}>Middle (ideal)</Text>
                      <Text style={styles.metricPercent}>
                        {heightMiddlePct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Bottom</Text>
                      <Text style={styles.metricPercent}>
                        {heightBottomPct.toFixed(0)}%
                      </Text>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={() => openDetail('bowHeight')}
                      >
                        <Text style={styles.viewMoreButtonText}>View more</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bow Angle</Text>
                    <Text>Correct: {summaryData.angleBreakdown?.Correct?.toFixed(1) || 0}%</Text>
                    <Text>Wrong: {summaryData.angleBreakdown?.Wrong?.toFixed(1) || 0}%</Text>

                    {/* icon + normalized breakdown for Bow Angle === */}
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotGood} />
                      <Text style={styles.metricLabel}>Parallel with bridge</Text>
                      <Text style={styles.metricPercent}>
                        {angleCorrectPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Tilted</Text>
                      <Text style={styles.metricPercent}>
                        {angleWrongPct.toFixed(0)}%
                      </Text>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={() => openDetail('bowAngle')}
                      >
                        <Text style={styles.viewMoreButtonText}>View more</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hand Posture</Text>
                    <Text>Correct: {summaryData.handPostureBreakdown?.Correct?.toFixed(1) || 0}%</Text>
                    <Text>Supination: {summaryData.handPostureBreakdown?.Supination?.toFixed(1) || 0}%</Text>
                    <Text>Too much pronation: {summaryData.handPostureBreakdown?.['Too much pronation']?.toFixed(1) || 0}%</Text>

                    {/* icon + normalized breakdown for Hand Posture === */}
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotGood} />
                      <Text style={styles.metricLabel}>Natural pronation</Text>
                      <Text style={styles.metricPercent}>
                        {handCorrectPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Supination</Text>
                      <Text style={styles.metricPercent}>
                        {handSupinationPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Too much pronation</Text>
                      <Text style={styles.metricPercent}>
                        {handTooMuchPct.toFixed(0)}%
                      </Text>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={() => openDetail('handPosture')}
                      >
                        <Text style={styles.viewMoreButtonText}>View more</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Elbow Posture</Text>
                    <Text>Correct: {summaryData.elbowPostureBreakdown?.Correct?.toFixed(1) || 0}%</Text>
                    <Text>Low elbow: {summaryData.elbowPostureBreakdown?.['Low elbow']?.toFixed(1) || 0}%</Text>
                    <Text>Elbow too high: {summaryData.elbowPostureBreakdown?.['Elbow too high']?.toFixed(1) || 0}%</Text>

                    {/* icon + normalized breakdown for Elbow Posture === */}
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotGood} />
                      <Text style={styles.metricLabel}>Natural</Text>
                      <Text style={styles.metricPercent}>
                        {elbowCorrectPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Elbow too low</Text>
                      <Text style={styles.metricPercent}>
                        {elbowLowPct.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <View style={styles.metricDotWarning} />
                      <Text style={styles.metricLabel}>Elbow too high</Text>
                      <Text style={styles.metricPercent}>
                        {elbowHighPct.toFixed(0)}%
                      </Text>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                      <TouchableOpacity
                        style={styles.viewMoreButton}
                        onPress={() => openDetail('elbowPosture')}
                      >
                        <Text style={styles.viewMoreButtonText}>View more</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                <View style={styles.section}>
                  <Text style={styles.timestamp}>
                    <Text style={styles.subTitle}>Total Playing Time: </Text>
                    {summaryData?.sessionDuration || "0s"}
                  </Text>
                </View>

                  <View style={styles.section}>
                    <Text style={styles.timestamp}>Completed On: {formattedTimestamp}</Text>
                  </View>
                </>
              ) : (
                <Text>No data available</Text>
              )}

              <Button title="Close" onPress={closeSummary} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.settingsModalContent}>
            <Text style={styles.title}>Settings</Text>
            
            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Maximum Bow Angle Tolerance (0-90°)</Text>
              <TextInput
                style={styles.settingsInput}
                keyboardType="numeric"
                placeholder="Enter angle (0-90)"
                value={tempMaxAngle.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  if (num >= 0 && num <= 90) {
                    setTempMaxAngle(num);
                  }
                }}
              />
              <Text style={styles.settingsHint}>
                Current value: {tempMaxAngle}° (Default: 15°)
              </Text>
            </View>

            <View style={styles.settingsFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={closeSettings}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={saveSettings}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Session History Modal (revisit old summaries with mock data) === */}
      <Modal visible={historyVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.title}>Session History</Text>
              {sessionHistory.length === 0 ? (
                <Text>No previous sessions yet.</Text>
              ) : (
                sessionHistory.map((s, index) => {
                  const label = s.timestamp
                    ? new Date(s.timestamp.replace(" ", "T")).toLocaleString()
                    : `Session ${sessionHistory.length - index}`;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.historyItem}
                      onPress={() => {
                        setSummaryData(s);
                        setSummaryVisible(true);
                        setHistoryVisible(false);
                      }}
                    >
                      <Text style={styles.historyItemTitle}>{label}</Text>
                      <Text style={styles.historyItemSubtitle}>
                        Total playing time: {s.sessionDuration || "0s"}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <Button title="Close" onPress={closeHistory} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail modal for "View more" with mock screenshot + tips === */}
      <Modal
        visible={!!selectedDetailSection}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detailModalContent}>
            <ScrollView>
              <Text style={styles.title}>
                {selectedDetailSection === 'bowHeight' && 'Bow Height Details'}
                {selectedDetailSection === 'bowAngle' && 'Bow Angle Details'}
                {selectedDetailSection === 'handPosture' && 'Hand Posture Details'}
                {selectedDetailSection === 'elbowPosture' && 'Elbow Posture Details'}
              </Text>

              <View style={styles.detailImagePlaceholder}>
                <Text style={styles.detailImageText}>
                  Screenshot / posture example (mock)
                </Text>
              </View>

              <Text>
                This is a mock “View more” panel. You can plug in real screenshots
                and short guidance for what a correct posture looks like and how
                to fix common mistakes.
              </Text>

              <Button title="Close" onPress={closeDetail} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CameraxView
        style={styles.camera}
        userId={userId}
        cameraActive={isCameraActive}
        detectionEnabled={isDetectionEnabled}
        lensType={lensType}
        onSessionEnd={handleSessionEnd}
        maxBowAngle={maxAngle}
      />
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.flipButton}
        onPress={toggleCamera}
        activeOpacity={0.7}
      >
        <Text style={styles.flipButtonText}>🔄</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={openSettings}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.detectionButton}
          onPress={() => {
            if (showSetupOverlay) setShowSetupOverlay(false);
            if (!isDetectionEnabled) {
              setSessionStartTime(new Date());
            }
            setIsDetectionEnabled(!isDetectionEnabled);
          }}
      >
        <Text style={styles.buttonText}>
          {isDetectionEnabled ? 'Stop Detection' : 'Start Detection'}
        </Text>
      </TouchableOpacity>

      {/* Button to revisit previous session summaries === */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={openHistory}
        activeOpacity={0.7}
      >
        <Text style={styles.historyButtonText}>Session History</Text>
      </TouchableOpacity>

      {showSetupOverlay && (
        <>
          {/* dark overlay */}
          <View pointerEvents="none" style={styles.vignette} />

          {/* cello silhouette */}
          <View pointerEvents="none" style={styles.silhouetteWrap}>
            <View style={styles.celloBody} />
            <View style={styles.bridgeGuide} />
            <View style={styles.endpinGuide} />
          </View>

          {/* setup instructions */}
          <View style={styles.instructionsCard}>
            <Text style={styles.cardTitle}>Set up your camera & cello</Text>
            <View style={{ height: 6 }} />
            <Bullet>Hold phone upright (portrait), ~1-2 ft (30-60 cm) away</Bullet>
            <Bullet>Center yourself and the cello inside the outline</Bullet>
            <Bullet>Keep the bridge near the dotted line</Bullet>
            <Bullet>Ensure the endpin is visible and background is clear</Bullet>

            <TouchableOpacity style={styles.readyBtn} onPress={handleReady} activeOpacity={0.9}>
              <Text style={styles.readyText}>Ready</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

function Bullet({ children }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

// helper to normalize percentage arrays so they sum to ~100% ===
function normalizePercentages(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + (v || 0), 0);
  if (total <= 0) {
    return values.map(() => 0);
  }
  const raw = values.map(v => ((v || 0) / total) * 100);
  const rounded = raw.map(v => Math.round(v));
  const diff = 100 - rounded.reduce((sum, v) => sum + v, 0);

  if (diff !== 0) {
    let idxMax = 0;
    for (let i = 1; i < rounded.length; i++) {
      if (rounded[i] > rounded[idxMax]) idxMax = i;
    }
    rounded[idxMax] += diff;
  }

  return rounded;
}

export default CameraComponent;