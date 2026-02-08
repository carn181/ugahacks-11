"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import MapGrid from "@/features/map-engine/MapGrid";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useInstitution } from "@/services/institutionService";
import { useRouter } from "next/navigation";

const ITEM_TYPES = [
  { type: "Potion", subtype: "Stun Brew", emoji: "🧪" },
  { type: "Gem", subtype: "Focus Crystal", emoji: "💎" },
  { type: "Chest", subtype: "Iron Crate", emoji: "📦" },
  { type: "Wand", subtype: "Oak Branch", emoji: "🪄" },
  { type: "Scroll", subtype: "Mirror Image", emoji: "📜" },
];

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? "bg-amber-400 text-purple-950 shadow-lg shadow-amber-400/30"
          : "bg-purple-800/50 text-purple-300 hover:bg-purple-700/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function InstitutionDashboard() {
  const router = useRouter();
  const {
    institution,
    isAuthenticated,
    logout,
    getInstitutionMaps,
    getInstitutionItems,
    createInstitutionItem,
    deleteInstitutionItem,
    getMapStudents,
    grantMapAccess,
    revokeMapAccess,
  } = useInstitution();

  const [activeTab, setActiveTab] = useState<
    "institution" | "design" | "students"
  >("institution");

  // Data state
  const [maps, setMaps] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Students tab state
  const [studentsMap, setStudentsMap] = useState<Record<string, any[]>>({});
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedStudentMapId, setSelectedStudentMapId] = useState<string>("");
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  // Design mode state
  const [clickLocation, setClickLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState(ITEM_TYPES[0]);
  const [placing, setPlacing] = useState(false);

  // Redirect handled by layout, but guard here too
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/institution/login");
    }
  }, [isAuthenticated, router]);

  // Load maps + items
  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [mapsData, itemsData] = await Promise.all([
          getInstitutionMaps(),
          getInstitutionItems(),
        ]);
        setMaps(mapsData);
        setItems(itemsData);
        if (mapsData.length > 0 && !selectedMapId) {
          setSelectedMapId(mapsData[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadStudents = useCallback(async () => {
    if (maps.length === 0) return;
    const studentsByMap: Record<string, any[]> = {};
    for (const map of maps) {
      try {
        studentsByMap[map.id] = await getMapStudents(map.id);
      } catch {
        studentsByMap[map.id] = [];
      }
    }
    setStudentsMap(studentsByMap);
  }, [maps, getMapStudents]);

  // Load students when tab becomes active
  useEffect(() => {
    if (activeTab === "students" && maps.length > 0) {
      loadStudents();
    }
  }, [activeTab, maps, loadStudents]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickLocation({ lat, lng });
    setShowPlaceModal(true);
  }, []);

  const handlePlaceItem = async () => {
    if (!clickLocation || !selectedMapId) return;
    setPlacing(true);
    try {
      await createInstitutionItem({
        type: selectedItemType.type,
        subtype: selectedItemType.subtype,
        map_id: selectedMapId,
        latitude: clickLocation.lat,
        longitude: clickLocation.lng,
        expires_in_hours: 24,
      });
      // Refresh items
      const updated = await getInstitutionItems();
      setItems(updated);
      setShowPlaceModal(false);
      setClickLocation(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to place item");
    } finally {
      setPlacing(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!window.confirm(`Delete ${item.subtype}?`)) return;
    try {
      await deleteInstitutionItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    }
  };

  const filteredItems = items.filter((item) => item.map_id === selectedMapId);
  const activeItems = items.filter(
    (item) => !item.expires_at || new Date(item.expires_at) > new Date(),
  );

  if (!isAuthenticated || !institution) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-purple-900/70 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏛️</div>
              <div>
                <h1 className="text-white font-bold text-lg">
                  {institution.name}
                </h1>
                <p className="text-purple-300 text-sm">Institution Panel</p>
              </div>
            </div>
            <GlassButton variant="ghost" onClick={logout} className="text-sm">
              Logout
            </GlassButton>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <TabButton
              active={activeTab === "institution"}
              onClick={() => setActiveTab("institution")}
            >
              Institution
            </TabButton>
            <TabButton
              active={activeTab === "design"}
              onClick={() => setActiveTab("design")}
            >
              Design
            </TabButton>
            <TabButton
              active={activeTab === "students"}
              onClick={() => setActiveTab("students")}
            >
              Students
            </TabButton>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-4xl"
          >
            🏛️
          </motion.div>
        </div>
      )}

      {/* Tab Content */}
      {!loading && (
        <>
          {/* ── INSTITUTION TAB ── */}
          {activeTab === "institution" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto px-4 py-8 space-y-6"
            >
              <GlassCard>
                <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🗺️</div>
                    <div className="text-white font-bold text-lg">
                      {maps.length}
                    </div>
                    <div className="text-purple-300 text-sm">Maps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="text-white font-bold text-lg">
                      {activeItems.length}
                    </div>
                    <div className="text-purple-300 text-sm">Active Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🧹</div>
                    <div className="text-white font-bold text-lg">
                      {items.length - activeItems.length}
                    </div>
                    <div className="text-purple-300 text-sm">Expired</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h2 className="text-xl font-bold text-white mb-4">Your Maps</h2>
                {maps.length === 0 ? (
                  <p className="text-purple-400 text-sm">No maps yet.</p>
                ) : (
                  <div className="space-y-2">
                    {maps.map((map) => {
                      const mapItemCount = items.filter(
                        (i) => i.map_id === map.id,
                      ).length;
                      return (
                        <div
                          key={map.id}
                          className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🗺️</span>
                            <span className="text-white">{map.name}</span>
                          </div>
                          <span className="text-purple-400 text-sm">
                            {mapItemCount} items
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <h2 className="text-xl font-bold text-white mb-4">All Items</h2>
                {items.length === 0 ? (
                  <p className="text-purple-400 text-sm">
                    No items placed yet. Use the Design tab to add items.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {items.map((item) => {
                      const expired =
                        item.expires_at &&
                        new Date(item.expires_at) <= new Date();
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {ITEM_TYPES.find((t) => t.type === item.type)
                                ?.emoji ?? "📦"}
                            </span>
                            <div>
                              <span
                                className={`text-sm ${expired ? "text-purple-500 line-through" : "text-white"}`}
                              >
                                {item.subtype}
                              </span>
                              <span className="text-purple-400 text-xs ml-2">
                                {item.map_name}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-500/30 hover:border-red-400/50 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* ── STUDENTS TAB ── */}
          {activeTab === "students" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto px-4 py-8 space-y-6"
            >
              {maps.length === 0 ? (
                <GlassCard>
                  <p className="text-purple-400 text-sm">
                    No maps available. Create a map first.
                  </p>
                </GlassCard>
              ) : (
                maps.map((map) => (
                  <GlassCard key={map.id}>
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedMapId(
                          expandedMapId === map.id ? null : map.id,
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🗺️</span>
                        <span className="text-white font-bold">{map.name}</span>
                        <span className="text-purple-400 text-sm">
                          ({(studentsMap[map.id] || []).length} students)
                        </span>
                      </div>
                      <span className="text-purple-400">
                        {expandedMapId === map.id ? "▼" : "▶"}
                      </span>
                    </div>

                    {expandedMapId === map.id && (
                      <div className="mt-4 space-y-3">
                        {/* Add student form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Wizard name..."
                            value={
                              selectedStudentMapId === map.id
                                ? studentSearchQuery
                                : ""
                            }
                            onFocus={() => setSelectedStudentMapId(map.id)}
                            onChange={(e) => {
                              setSelectedStudentMapId(map.id);
                              setStudentSearchQuery(e.target.value);
                            }}
                            onKeyDown={async (e) => {
                              if (
                                e.key !== "Enter" ||
                                !studentSearchQuery.trim()
                              )
                                return;
                              setAddingStudent(true);
                              try {
                                await grantMapAccess(
                                  map.id,
                                  studentSearchQuery,
                                );
                                setStudentSearchQuery("");
                                loadStudents();
                              } catch (err) {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to add student",
                                );
                              } finally {
                                setAddingStudent(false);
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-purple-800/50 border border-purple-500/20 text-white text-sm placeholder-purple-500 focus:outline-none focus:border-amber-400/50"
                          />
                          <button
                            onClick={async () => {
                              if (!studentSearchQuery.trim()) return;
                              setAddingStudent(true);
                              try {
                                await grantMapAccess(
                                  map.id,
                                  studentSearchQuery,
                                );
                                setStudentSearchQuery("");
                                loadStudents();
                              } catch (err) {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to add student",
                                );
                              } finally {
                                setAddingStudent(false);
                              }
                            }}
                            disabled={addingStudent}
                            className="px-4 py-2 rounded-lg bg-amber-400 text-purple-950 font-medium text-sm hover:bg-amber-300 disabled:opacity-50 transition-all"
                          >
                            {addingStudent ? "Adding..." : "Add"}
                          </button>
                        </div>

                        {/* Student list */}
                        {(studentsMap[map.id] || []).length === 0 ? (
                          <p className="text-purple-500 text-sm">
                            No students assigned yet.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {(studentsMap[map.id] || []).map((student) => (
                              <div
                                key={student.profile_id}
                                className="flex items-center justify-between py-2 border-b border-purple-500/20 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🧙</span>
                                  <span className="text-white text-sm">
                                    {student.profile_name}
                                  </span>
                                  <span className="text-purple-500 text-xs">
                                    Lv.{student.level}
                                  </span>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `Remove ${student.profile_name} from ${map.name}?`,
                                      )
                                    )
                                      return;
                                    try {
                                      await revokeMapAccess(
                                        map.id,
                                        student.profile_id,
                                      );
                                      loadStudents();
                                    } catch (err) {
                                      setError(
                                        err instanceof Error
                                          ? err.message
                                          : "Failed to remove student",
                                      );
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-500/30 hover:border-red-400/50 transition-all"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </GlassCard>
                ))
              )}
            </motion.div>
          )}

          {/* ── DESIGN TAB ── */}
          {activeTab === "design" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
              style={{ height: "calc(100vh - 9rem)" }}
            >
              {/* Design toolbar */}
              <div className="bg-purple-900/50 backdrop-blur-sm border-b border-purple-500/20 px-4 py-2 flex items-center gap-3 flex-shrink-0">
                <span className="text-purple-300 text-sm">Map:</span>
                {maps.length === 0 ? (
                  <span className="text-purple-400 text-sm">
                    No maps available
                  </span>
                ) : (
                  <select
                    value={selectedMapId}
                    onChange={(e) => setSelectedMapId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-purple-800/50 border border-purple-500/20 text-white text-sm focus:outline-none focus:border-amber-400/50"
                  >
                    {maps.map((map) => (
                      <option key={map.id} value={map.id}>
                        {map.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-purple-400 text-xs ml-auto">
                  Click map to place items • Click markers to delete
                </span>
              </div>

              {/* Map */}
              <div className="relative flex-1">
                {maps.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <GlassCard className="text-center max-w-sm">
                      <div className="text-5xl mb-4">🗺️</div>
                      <p className="text-purple-300">
                        No maps assigned to your institution yet.
                      </p>
                    </GlassCard>
                  </div>
                ) : (
                  <MapGrid
                    items={filteredItems}
                    playerPos={null}
                    onItemClick={handleDeleteItem}
                    onMapClick={handleMapClick}
                    institutionMode={true}
                  />
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Place Item Modal */}
      <GlassModal
        isOpen={showPlaceModal}
        onClose={() => {
          setShowPlaceModal(false);
          setClickLocation(null);
        }}
        title="Place Item"
      >
        <div className="space-y-4">
          {clickLocation && (
            <div className="text-center p-3 bg-purple-800/30 rounded-lg">
              <p className="text-purple-300 text-sm">
                📍 {clickLocation.lat.toFixed(5)},{" "}
                {clickLocation.lng.toFixed(5)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Select Item:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ITEM_TYPES.map((item) => (
                <button
                  key={`${item.type}-${item.subtype}`}
                  onClick={() => setSelectedItemType(item)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedItemType.type === item.type
                      ? "border-amber-400 bg-amber-400/20"
                      : "border-purple-500/30 bg-purple-800/50 hover:border-purple-400/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-white text-sm font-medium">
                    {item.subtype}
                  </div>
                  <div className="text-purple-400 text-xs">{item.type}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <GlassButton
              variant="secondary"
              onClick={() => {
                setShowPlaceModal(false);
                setClickLocation(null);
              }}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handlePlaceItem}
              disabled={placing}
              className="flex-1"
            >
              {placing ? "Placing..." : "Place Item"}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
