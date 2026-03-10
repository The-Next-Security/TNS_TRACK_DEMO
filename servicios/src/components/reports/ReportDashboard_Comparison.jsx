/**
 * @fileoverview Comparison component to test and showcase UX enhancements
 * @description Side-by-side comparison of original vs enhanced dashboard
 * @feature 004-reportes-base-core (T019) - UX Testing
 * @version 1.0.0
 */

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import {
  CheckCircle2,
  XCircle,
  Info,
  Smartphone,
  Monitor,
  Accessibility,
  Zap,
  Sparkles
} from "lucide-react";

// Import both versions
import ReportDashboardV2 from "./ReportDashboard_View";
import ReportDashboardV2Enhanced from "./ReportDashboard_View_Enhanced";

/**
 * Feature comparison data
 */
const ENHANCEMENTS = [
  {
    category: "Mobile UX",
    icon: <Smartphone className="h-5 w-5" />,
    features: [
      { name: "Responsive table layout", original: false, enhanced: true },
      { name: "Touch-friendly buttons (44x44px)", original: false, enhanced: true },
      { name: "Swipeable cards", original: false, enhanced: true },
      { name: "Collapsible report details", original: false, enhanced: true },
      { name: "Mobile-optimized spacing", original: false, enhanced: true },
    ]
  },
  {
    category: "Desktop UX",
    icon: <Monitor className="h-5 w-5" />,
    features: [
      { name: "Keyboard navigation", original: false, enhanced: true },
      { name: "Sortable columns", original: false, enhanced: true },
      { name: "Search/filter", original: false, enhanced: true },
      { name: "Hover states with actions", original: true, enhanced: true },
      { name: "Tooltips for truncated content", original: false, enhanced: true },
    ]
  },
  {
    category: "Accessibility",
    icon: <Accessibility className="h-5 w-5" />,
    features: [
      { name: "ARIA labels", original: false, enhanced: true },
      { name: "Focus management", original: false, enhanced: true },
      { name: "Screen reader support", original: false, enhanced: true },
      { name: "Keyboard shortcuts", original: false, enhanced: true },
      { name: "Skip to content link", original: false, enhanced: true },
    ]
  },
  {
    category: "Performance",
    icon: <Zap className="h-5 w-5" />,
    features: [
      { name: "Auto-refresh (1 min)", original: false, enhanced: true },
      { name: "Optimized re-renders", original: false, enhanced: true },
      { name: "Memoized computations", original: false, enhanced: true },
      { name: "Loading skeletons", original: true, enhanced: true },
      { name: "Smooth animations", original: true, enhanced: true },
    ]
  },
  {
    category: "Visual & Interactions",
    icon: <Sparkles className="h-5 w-5" />,
    features: [
      { name: "New report indicators", original: false, enhanced: true },
      { name: "Empty state illustration", original: false, enhanced: true },
      { name: "Status badges animation", original: false, enhanced: true },
      { name: "Progressive disclosure", original: false, enhanced: true },
      { name: "Micro-interactions", original: false, enhanced: true },
    ]
  }
];

/**
 * Comparison Dashboard Component
 */
const ReportDashboardComparison = () => {
  const [activeVersion, setActiveVersion] = useState("enhanced");
  const [showFeatures, setShowFeatures] = useState(true);

  // Calculate score
  const calculateScore = (isOriginal) => {
    let total = 0;
    let implemented = 0;

    ENHANCEMENTS.forEach(category => {
      category.features.forEach(feature => {
        total++;
        if (isOriginal ? feature.original : feature.enhanced) {
          implemented++;
        }
      });
    });

    return Math.round((implemented / total) * 100);
  };

  const originalScore = calculateScore(true);
  const enhancedScore = calculateScore(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Report Dashboard UX Enhancement Comparison
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Compare original vs enhanced version with UX improvements
              </p>
            </div>
            <Button
              variant={showFeatures ? "default" : "outline"}
              onClick={() => setShowFeatures(!showFeatures)}
              className="gap-2"
            >
              <Info className="h-4 w-4" />
              {showFeatures ? "Hide" : "Show"} Features
            </Button>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card className={activeVersion === "original" ? "ring-2 ring-gray-400" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Original Version</CardTitle>
                  <Badge variant="secondary">{originalScore}% Complete</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${originalScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={activeVersion === "enhanced" ? "ring-2 ring-blue-500" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Enhanced Version</CardTitle>
                  <Badge className="bg-blue-500">{enhancedScore}% Complete</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${enhancedScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      {showFeatures && (
        <div className="container mx-auto px-4 py-6">
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Testing Instructions:</strong> Resize your browser to test mobile responsiveness,
              use Tab key for keyboard navigation, and check the hover states on desktop view.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {ENHANCEMENTS.map((category) => (
              <Card key={category.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {category.icon}
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.features.map((feature) => (
                      <div
                        key={feature.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature.name}
                        </span>
                        <div className="flex gap-3">
                          <div
                            className="flex items-center gap-1"
                            title="Original"
                          >
                            {feature.original ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <div
                            className="flex items-center gap-1"
                            title="Enhanced"
                          >
                            {feature.enhanced ? (
                              <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Version Tabs */}
      <div className="container mx-auto px-4 pb-6">
        <Tabs value={activeVersion} onValueChange={setActiveVersion}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="original" className="mt-0">
              <Card>
                <CardContent className="p-0">
                  <ReportDashboardV2 />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enhanced" className="mt-0">
              <Card>
                <CardContent className="p-0">
                  <ReportDashboardV2Enhanced />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportDashboardComparison;