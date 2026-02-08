"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useInstitution } from "@/services/institutionService";

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
  const { institution, logout, isInstitutionAuthenticated } = useInstitution();
  const [activeTab, setActiveTab] = useState<"institution" | "design">("institution");
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!isInstitutionAuthenticated() || !institution) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <GlassCard className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-purple-300 mb-6">Please log in to access the institution dashboard</p>
          <GlassButton onClick={() => window.location.href = "/institution/login"}>
            Go to Login
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  const loadInstitutionData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load institution data (maps, items, etc.)
      // This will be implemented when we create the design component
      setInstitutionData({ loaded: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-purple-900/70 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl">🏛️</div>
              <div>
                <h1 className="text-white font-bold text-lg">{institution.name}</h1>
                <p className="text-purple-300 text-sm">Institution Control Panel</p>
              </div>
            </div>
            
            <GlassButton
              variant="ghost"
              onClick={logout}
              className="text-sm"
            >
              Logout
            </GlassButton>
          </div>
          
          {/* Tabs */}
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-4xl inline-block mb-4"
            >
              🏛️
            </motion.div>
            <p className="text-purple-300">Loading institution data...</p>
          </div>
        )}

        {error && (
          <GlassCard className="mb-6 border-red-500/40">
            <p className="text-red-400 text-center">{error}</p>
          </GlassCard>
        )}

        {!loading && !error && (
          <>
            {activeTab === "institution" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <GlassCard>
                  <h2 className="text-xl font-bold text-white mb-4">Institution Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🗺️</div>
                      <div className="text-white font-bold text-lg">3</div>
                      <div className="text-purple-300 text-sm">Total Maps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl mb-2">📦</div>
                      <div className="text-white font-bold text-lg">24</div>
                      <div className="text-purple-300 text-sm">Active Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl mb-2">👥</div>
                      <div className="text-white font-bold text-lg">156</div>
                      <div className="text-purple-300 text-sm">Players Today</div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-purple-500/20">
                      <span className="text-purple-300">New item placed on Main Campus</span>
                      <span className="text-purple-400 text-sm">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-purple-500/20">
                      <span className="text-purple-300">15 items collected</span>
                      <span className="text-purple-400 text-sm">5 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-purple-300">New map created: Science Building</span>
                      <span className="text-purple-400 text-sm">1 day ago</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === "design" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Map Design Studio</h2>
                    <p className="text-purple-300 mb-6">
                      Interactive map for placing items and markers will appear here
                    </p>
                    <GlassButton onClick={() => window.location.href = "/institution/design"}>
                      Open Design Studio
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}