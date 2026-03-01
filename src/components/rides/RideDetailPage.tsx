"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Gauge,
  Route,
  Clock,
  Star,
  Shield,
  CheckCircle,
  AlertTriangle,
  Bike,
  User,
  IndianRupee,
  Loader2,
  ImagePlus,
  Send,
  Phone,
  Mail,
  Heart,
  Droplets,
  Car,
  FileText,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { riderNameToId } from "@/data/rider-profiles";
import type { RidePost } from "@/types";

// Helper: look up a rider profile link by name
function getRiderLink(name: string): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return riderNameToId[key] ? `/rider?id=${riderNameToId[key]}` : null;
}

// Helper: build a Google Maps search URL for a location
function getGoogleMapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

interface Ride {
  id: string;
  title: string;
  rideNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  startLocation: string;
  endLocation: string;
  route: string[];
  highlights: string[];
  distanceKm: number;
  maxRiders: number;
  registeredRiders: number;
  difficulty: string;
  description: string;
  fee: number;
  leadRider: string;
  sweepRider: string;
  registrations: unknown[];
  riders?: string[];
  posterUrl?: string;
  accountsBy?: string;
  organisedBy?: string;
  meetupTime?: string;
  rideStartTime?: string;
  startingPoint?: string;
}

export function RideDetailPage({ rideId }: { rideId: string }) {
  const { user, canEditRide, canApproveContent, isT2WRiderOrAbove, isLoggedIn } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Registration form state
  const [regForm, setRegForm] = useState({
    riderName: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bloodGroup: "",
    vehicleModel: "",
    vehicleRegNumber: "",
    agreedIndemnity: false,
  });

  // Ride posts
  const [ridePosts, setRidePosts] = useState<RidePost[]>([]);
  const [taleText, setTaleText] = useState("");
  const [postingTale, setPostingTale] = useState(false);
  const [taleSubmitted, setTaleSubmitted] = useState(false);

  // Pre-fill registration form from user data
  useEffect(() => {
    if (user) {
      setRegForm((prev) => ({
        ...prev,
        riderName: prev.riderName || user.name,
        email: prev.email || user.email,
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  const [posterUploading, setPosterUploading] = useState(false);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Image must be under 15MB");
      return;
    }
    setPosterUploading(true);

    // Compress image via canvas to avoid localStorage quota issues
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setPosterUploading(false); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      try {
        localStorage.setItem(`t2w_poster_${rideId}`, dataUrl);
        setPosterUrl(dataUrl);
      } catch {
        alert("Image too large to save. Please use a smaller image.");
      }
      setPosterUploading(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert("Failed to load image. Please try another file.");
      setPosterUploading(false);
    };
    img.src = objectUrl;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.rides.get(rideId),
      api.ridePosts.listApproved(rideId),
    ])
      .then(([rideData, postsData]) => {
        if (cancelled) return;
        const result = rideData as { ride: Ride };
        const r = result.ride;
        if (typeof r.route === "string") {
          r.route = JSON.parse(r.route);
        }
        if (typeof r.highlights === "string") {
          r.highlights = JSON.parse(r.highlights);
        }
        setRide(r);
        setRidePosts((postsData as { posts: RidePost[] }).posts);
        // Load saved poster from localStorage
        const savedPoster = localStorage.getItem(`t2w_poster_${rideId}`);
        if (savedPoster) setPosterUrl(savedPoster);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load ride");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rideId]);

  const handleRegister = async () => {
    if (!regForm.agreedIndemnity || registering) return;
    if (!regForm.riderName || !regForm.email || !regForm.phone) {
      alert("Please fill in all required fields");
      return;
    }
    setRegistering(true);
    try {
      const data = (await api.rides.register(rideId, {
        ...regForm,
      })) as { registration: unknown; confirmationCode: string };
      setRegistered(true);
      setConfirmationCode(data.confirmationCode);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      alert(message);
    } finally {
      setRegistering(false);
    }
  };

  const handlePostTale = async () => {
    if (!taleText.trim() || !user) return;
    setPostingTale(true);
    try {
      // SuperAdmin/CoreMember: auto-approved. T2W Rider: pending
      const autoApprove = canApproveContent;
      await api.ridePosts.create({
        rideId,
        authorId: user.id,
        authorName: user.name,
        content: taleText,
        approvalStatus: autoApprove ? "approved" : "pending",
        approvedBy: autoApprove ? user.id : undefined,
      });
      setTaleText("");
      setTaleSubmitted(true);
      if (autoApprove) {
        // Reload posts
        const postsData = await api.ridePosts.listApproved(rideId);
        setRidePosts((postsData as { posts: RidePost[] }).posts);
      }
    } catch {
      alert("Failed to post. Please try again.");
    } finally {
      setPostingTale(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-t2w-accent" />
          <p className="mt-4 text-t2w-muted">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="text-center">
          <Bike className="mx-auto h-16 w-16 text-t2w-border" />
          <h2 className="mt-4 font-display text-2xl font-bold text-white">
            Ride Not Found
          </h2>
          <Link href="/rides" className="mt-4 inline-block text-t2w-accent">
            &larr; Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  const spotsLeft = ride.maxRiders - ride.registeredRiders;
  const difficultyColors: Record<string, string> = {
    easy: "text-green-400 bg-green-400/10",
    moderate: "text-yellow-400 bg-yellow-400/10",
    challenging: "text-orange-400 bg-orange-400/10",
    extreme: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link
          href="/rides"
          className="mb-8 inline-flex items-center gap-2 text-sm text-t2w-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to T2W Tales
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-lg px-3 py-1 text-sm font-medium capitalize ${
                ride.status === "upcoming"
                  ? "bg-blue-400/10 text-blue-400"
                  : "bg-green-400/10 text-green-400"
              }`}
            >
              {ride.status}
            </span>
            <span
              className={`rounded-lg px-3 py-1 text-sm font-medium ${difficultyColors[ride.difficulty]}`}
            >
              {ride.difficulty}
            </span>
            <span className="font-mono text-sm text-t2w-muted">
              {ride.rideNumber}
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            {ride.title}
          </h1>
          <p className="mt-4 text-lg text-t2w-muted">{ride.description}</p>
        </div>

        {/* Ride Poster */}
        {(ride.posterUrl || posterUrl) ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-t2w-border relative group">
            <img
              src={posterUrl || ride.posterUrl}
              alt={`${ride.title} poster`}
              className="w-full object-cover"
            />
            {canEditRide && (
              <>
                <button
                  onClick={() => posterInputRef.current?.click()}
                  disabled={posterUploading}
                  className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {posterUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {posterUploading ? "Saving..." : "Change Poster"}
                </button>
                <input
                  ref={posterInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
        ) : canEditRide ? (
          <div className="mb-8">
            <button
              onClick={() => posterInputRef.current?.click()}
              disabled={posterUploading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-t2w-border bg-t2w-surface/50 py-10 text-t2w-muted transition-colors hover:border-t2w-accent/50 hover:text-t2w-accent"
            >
              {posterUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
              <span className="text-sm font-medium">
                {posterUploading ? "Compressing & Saving..." : "Upload Ride Poster"}
              </span>
            </button>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              onChange={handlePosterUpload}
              className="hidden"
            />
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ride Info Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  icon: Gauge,
                  label: "Distance",
                  value: `${ride.distanceKm} km`,
                },
                {
                  icon: Calendar,
                  label: "Date",
                  value: new Date(ride.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  }),
                },
                {
                  icon: Users,
                  label: "Riders",
                  value: `${ride.registeredRiders}/${ride.maxRiders}`,
                },
                {
                  icon: IndianRupee,
                  label: "Fee",
                  value: `₹${ride.fee.toLocaleString()}`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-t2w-border bg-t2w-surface p-4 text-center"
                >
                  <Icon className="mx-auto h-5 w-5 text-t2w-accent" />
                  <div className="mt-2 font-display text-lg font-bold text-white">
                    {value}
                  </div>
                  <div className="text-xs text-t2w-muted">{label}</div>
                </div>
              ))}
            </div>

            {/* Route */}
            <div className="card">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <Route className="h-5 w-5 text-t2w-accent" />
                Route
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {ride.route.map((stop, i) => (
                  <div key={stop} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-t2w-surface-light px-3 py-2 text-sm text-white whitespace-nowrap">
                      <MapPin className="h-3.5 w-3.5 text-t2w-accent" />
                      {stop}
                    </div>
                    {i < ride.route.length - 1 && (
                      <span className="text-t2w-muted">&rarr;</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            {ride.highlights.length > 0 && (
              <div className="card">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                  <Star className="h-5 w-5 text-t2w-gold" />
                  Ride Highlights
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ride.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-center gap-3 rounded-xl bg-t2w-surface-light p-3"
                    >
                      <CheckCircle className="h-4 w-4 shrink-0 text-t2w-accent" />
                      <span className="text-sm text-gray-300">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ride Leaders */}
            <div className="card">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <Shield className="h-5 w-5 text-t2w-accent" />
                Ride Crew
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Lead Rider", name: ride.leadRider, iconColor: "bg-t2w-accent/10", textColor: "text-t2w-accent" },
                  { label: "Sweep Rider", name: ride.sweepRider, iconColor: "bg-t2w-gold/10", textColor: "text-t2w-gold" },
                  ...(ride.organisedBy && ride.organisedBy !== ride.leadRider && ride.organisedBy !== ride.sweepRider
                    ? [{ label: "Organised By", name: ride.organisedBy, iconColor: "bg-purple-400/10", textColor: "text-purple-400" }]
                    : []),
                  ...(ride.accountsBy && ride.accountsBy !== ride.leadRider && ride.accountsBy !== ride.sweepRider && ride.accountsBy !== ride.organisedBy
                    ? [{ label: "Accounts", name: ride.accountsBy, iconColor: "bg-green-400/10", textColor: "text-green-400" }]
                    : []),
                ].filter(c => c.name).map((crew) => {
                  const link = getRiderLink(crew.name);
                  const inner = (
                    <>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${crew.iconColor}`}>
                        <User className={`h-6 w-6 ${crew.textColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-t2w-muted">{crew.label}</p>
                        <p className={`font-semibold ${link ? "text-t2w-accent" : "text-white"}`}>{crew.name}</p>
                      </div>
                    </>
                  );
                  return link ? (
                    <Link key={crew.label} href={link} className="flex items-center gap-4 rounded-xl bg-t2w-surface-light p-4 transition-all hover:bg-t2w-accent/10 hover:ring-1 hover:ring-t2w-accent/30">
                      {inner}
                    </Link>
                  ) : (
                    <div key={crew.label} className="flex items-center gap-4 rounded-xl bg-t2w-surface-light p-4">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Riders List - for completed rides with rider data */}
            {ride.status === "completed" && ride.riders && ride.riders.length > 0 && (
              <div className="card">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                  <Users className="h-5 w-5 text-t2w-accent" />
                  Riders ({ride.riders.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ride.riders.map((riderName, index) => {
                    const riderId = riderNameToId[riderName.toLowerCase().trim()];
                    return riderId ? (
                      <Link
                        key={`${riderName}-${index}`}
                        href={`/rider?id=${riderId}`}
                        className="flex items-center gap-3 rounded-xl bg-t2w-surface-light p-3 transition-all hover:bg-t2w-accent/10 hover:ring-1 hover:ring-t2w-accent/30"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-t2w-accent/10 text-xs font-bold text-t2w-accent">
                          {index + 1}
                        </div>
                        <span className="text-sm text-t2w-accent truncate hover:underline">
                          {riderName}
                        </span>
                      </Link>
                    ) : (
                      <div
                        key={`${riderName}-${index}`}
                        className="flex items-center gap-3 rounded-xl bg-t2w-surface-light p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-t2w-accent/10 text-xs font-bold text-t2w-accent">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-300 truncate">
                          {riderName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approved Ride Posts / Tales */}
            {ridePosts.length > 0 && (
              <div className="card">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                  <FileText className="h-5 w-5 text-t2w-accent" />
                  Rider Tales ({ridePosts.length})
                </h3>
                <div className="space-y-4">
                  {ridePosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-xl bg-t2w-surface-light p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-t2w-accent/10 text-xs font-bold text-t2w-accent">
                          {post.authorName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {post.authorName}
                          </p>
                          <p className="text-xs text-t2w-muted">
                            {new Date(post.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-line">
                        {post.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share Experience - for completed rides, T2W riders+ */}
            {ride.status === "completed" && isLoggedIn && (
              <div className="card">
                <h3 className="mb-4 font-display text-lg font-bold text-white">
                  Share Your Experience
                </h3>
                {!isT2WRiderOrAbove ? (
                  <p className="text-sm text-t2w-muted">
                    Only T2W riders who have participated in rides can share
                    tales.
                  </p>
                ) : taleSubmitted && !canApproveContent ? (
                  <div className="rounded-xl bg-green-400/10 border border-green-400/20 p-4 text-center">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                    <p className="mt-2 text-sm font-medium text-green-400">
                      Your tale has been submitted!
                    </p>
                    <p className="mt-1 text-xs text-t2w-muted">
                      It will be visible once approved by a Core Member or Super
                      Admin.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-4 text-sm text-t2w-muted">
                      Were you part of this ride? Share your personal experience
                      with the T2W community.
                      {!canApproveContent && (
                        <span className="text-yellow-400">
                          {" "}
                          (Subject to approval)
                        </span>
                      )}
                    </p>
                    <textarea
                      rows={4}
                      className="input-field mb-4 resize-none"
                      placeholder="Write about your ride experience..."
                      value={taleText}
                      onChange={(e) => setTaleText(e.target.value)}
                    />
                    <button
                      onClick={handlePostTale}
                      disabled={!taleText.trim() || postingTale}
                      className="btn-primary flex items-center gap-2"
                    >
                      {postingTale ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {postingTale ? "Posting..." : "Post Your Tale"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card - for upcoming rides */}
            {ride.status === "upcoming" && !registered && (
              <div className="card sticky top-28">
                <h3 className="mb-4 font-display text-lg font-bold text-white">
                  Register for this Ride
                </h3>

                {!user ? (
                  <div className="rounded-xl bg-t2w-surface-light p-4 text-center">
                    <p className="text-sm text-t2w-muted mb-3">
                      You must be logged in to register for a ride.
                    </p>
                    <Link href="/login" className="btn-primary inline-block">
                      Log In to Register
                    </Link>
                  </div>
                ) : spotsLeft > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl bg-t2w-accent/10 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-t2w-muted">
                          Registration Fee
                        </span>
                        <span className="font-display text-2xl font-bold text-t2w-accent">
                          ₹{ride.fee.toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-t2w-muted">
                        {spotsLeft} spots remaining
                      </p>
                    </div>

                    {!showRegistration ? (
                      <button
                        onClick={() => setShowRegistration(true)}
                        className="btn-primary w-full"
                      >
                        Register Now
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {/* Registration Form */}
                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Rider Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <input
                              type="text"
                              required
                              className="input-field !pl-9 !py-2 text-sm"
                              value={regForm.riderName}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  riderName: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Email *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <input
                              type="email"
                              required
                              className="input-field !pl-9 !py-2 text-sm"
                              value={regForm.email}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  email: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Phone *
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <input
                              type="tel"
                              required
                              className="input-field !pl-9 !py-2 text-sm"
                              value={regForm.phone}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-t2w-muted">
                              Emergency Contact
                            </label>
                            <input
                              type="text"
                              className="input-field !py-2 text-sm"
                              placeholder="Name"
                              value={regForm.emergencyContactName}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  emergencyContactName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-t2w-muted">
                              Emergency Phone
                            </label>
                            <input
                              type="tel"
                              className="input-field !py-2 text-sm"
                              placeholder="Phone"
                              value={regForm.emergencyContactPhone}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  emergencyContactPhone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Blood Group
                          </label>
                          <div className="relative">
                            <Droplets className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <select
                              className="input-field !pl-9 !py-2 text-sm cursor-pointer"
                              value={regForm.bloodGroup}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  bloodGroup: e.target.value,
                                })
                              }
                            >
                              <option value="">Select</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Vehicle Model
                          </label>
                          <div className="relative">
                            <Bike className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <input
                              type="text"
                              className="input-field !pl-9 !py-2 text-sm"
                              placeholder="e.g. Royal Enfield Himalayan 450"
                              value={regForm.vehicleModel}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  vehicleModel: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-t2w-muted">
                            Vehicle Reg. Number
                          </label>
                          <div className="relative">
                            <Car className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t2w-muted" />
                            <input
                              type="text"
                              className="input-field !pl-9 !py-2 text-sm"
                              placeholder="e.g. KA 01 AB 1234"
                              value={regForm.vehicleRegNumber}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  vehicleRegNumber: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* Indemnity Agreement */}
                        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                            <div>
                              <h4 className="text-xs font-semibold text-yellow-400">
                                Indemnity Agreement
                              </h4>
                              <p className="mt-1 text-xs text-t2w-muted leading-relaxed">
                                I understand that motorcycle riding involves
                                inherent risks. I voluntarily participate and
                                assume all risks. I release T2W from liability
                                for any injury or damage. I confirm I hold a
                                valid driving license and insurance.
                              </p>
                            </div>
                          </div>
                          <label className="mt-2 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={regForm.agreedIndemnity}
                              onChange={(e) =>
                                setRegForm({
                                  ...regForm,
                                  agreedIndemnity: e.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-t2w-border accent-t2w-accent"
                            />
                            <span className="text-xs text-gray-300">
                              I agree to the indemnity terms
                            </span>
                          </label>
                        </div>

                        <button
                          disabled={!regForm.agreedIndemnity || registering}
                          onClick={handleRegister}
                          className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                            regForm.agreedIndemnity && !registering
                              ? "btn-primary"
                              : "cursor-not-allowed bg-t2w-surface-light text-t2w-muted"
                          }`}
                        >
                          {registering
                            ? "Processing..."
                            : `Confirm & Pay ₹${ride.fee.toLocaleString()}`}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-red-400/10 p-4 text-center">
                    <p className="text-sm font-medium text-red-400">
                      This ride is fully booked
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Registration Confirmation */}
            {registered && (
              <div className="card border-green-400/30 bg-green-400/5">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-3 font-display text-lg font-bold text-white">
                    Registration Confirmed!
                  </h3>
                  <p className="mt-2 text-sm text-t2w-muted">
                    You are registered for {ride.title}. Check your email for
                    ride details and meeting point information.
                  </p>
                  <div className="mt-4 rounded-xl bg-t2w-surface p-3 font-mono text-sm text-t2w-accent">
                    Confirmation #{confirmationCode}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="card">
              <h4 className="mb-3 text-sm font-semibold text-t2w-muted uppercase tracking-wider">
                Quick Info
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-t2w-muted">Type</span>
                  <span className="font-medium text-white capitalize">
                    {ride.type.replace("-", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-t2w-muted">Start</span>
                  <span className="font-medium text-white">
                    {ride.startLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-t2w-muted">End</span>
                  <span className="font-medium text-white">
                    {ride.endLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-t2w-muted">Duration</span>
                  <span className="font-medium text-white">
                    {ride.startDate === ride.endDate
                      ? "1 Day"
                      : `${Math.ceil(
                          (new Date(ride.endDate).getTime() -
                            new Date(ride.startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )} Days`}
                  </span>
                </div>
                {ride.organisedBy && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-t2w-muted">Organised By</span>
                    {getRiderLink(ride.organisedBy) ? (
                      <Link href={getRiderLink(ride.organisedBy)!} className="font-medium text-t2w-accent hover:underline">
                        {ride.organisedBy}
                      </Link>
                    ) : (
                      <span className="font-medium text-white">{ride.organisedBy}</span>
                    )}
                  </div>
                )}
                {ride.accountsBy && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-t2w-muted">Accounts</span>
                    {getRiderLink(ride.accountsBy) ? (
                      <Link href={getRiderLink(ride.accountsBy)!} className="font-medium text-t2w-accent hover:underline">
                        {ride.accountsBy}
                      </Link>
                    ) : (
                      <span className="font-medium text-white">{ride.accountsBy}</span>
                    )}
                  </div>
                )}
                {ride.startingPoint && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-t2w-muted">Starting Point</span>
                    <a
                      href={getGoogleMapsUrl(ride.startingPoint)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-t2w-accent hover:underline flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {ride.startingPoint}
                    </a>
                  </div>
                )}
                {ride.meetupTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-t2w-muted">Meetup Time</span>
                    <span className="font-medium text-white">
                      {ride.meetupTime}
                    </span>
                  </div>
                )}
                {ride.rideStartTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-t2w-muted">Ride Starts</span>
                    <span className="font-medium text-white">
                      {ride.rideStartTime}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
