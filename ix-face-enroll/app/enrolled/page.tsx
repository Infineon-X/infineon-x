"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2, RefreshCw, Search, Users, ArrowUpDown, AlertCircle } from "lucide-react";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://138.197.234.202:8080";
const ENROLLMENT_DELIMITER = "__rel__";

type SortField = "name" | "relationship";
type SortDirection = "asc" | "desc";

export const dynamic = 'force-dynamic'

interface EnrolledPerson {
  id: string;
  displayName: string;
  displayRelationship: string;
  normalizedName: string;
  normalizedRelationship: string;
  initials: string;
  avatarUrl?: string | null;
}

const formatTitleCase = (value: string) => {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const extractInitials = (value: string) => {
  const parts = value.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const parseIdentifier = (identifier: string): EnrolledPerson => {
  const [rawName = "", rawRelationship = ""] = identifier.split(ENROLLMENT_DELIMITER);
  const displayName = formatTitleCase(rawName) || "Unnamed";
  const displayRelationship = rawRelationship ? formatTitleCase(rawRelationship) : "Unknown";
  const initials = extractInitials(displayName);

  return {
    id: identifier,
    displayName,
    displayRelationship,
    normalizedName: rawName.toLowerCase(),
    normalizedRelationship: rawRelationship.toLowerCase(),
    initials,
    avatarUrl: null,
  };
};

export default function EnrolledListPage() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const loadApiUrl = () => {
    const savedApiUrl = typeof window !== "undefined" ? localStorage.getItem("apiUrl") : null;
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
    }
  };

  useEffect(() => {
    loadApiUrl();
  }, []);

  const fetchEnrolledPeople = async () => {
    if (!apiUrl) return;
    setIsLoading(true);
    setError(null);

    try {
      const useProxy = process.env.NODE_ENV === "production" || apiUrl.includes("165.227.17.154");
      const healthUrl = useProxy ? "/api/health" : `${apiUrl}/health`;
      const response = await fetch(healthUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      const knownPeople: string[] = data?.known_people || [];
      setPeople(knownPeople.map(parseIdentifier));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load enrolled faces";
      setError(message);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredPeople = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? people.filter(
          (person) =>
            person.displayName.toLowerCase().includes(query) ||
            person.displayRelationship.toLowerCase().includes(query) ||
            person.normalizedName.includes(query) ||
            person.normalizedRelationship.includes(query)
        )
      : people;

    return [...filtered].sort((a, b) => {
      const aValue = (sortField === "name" ? a.displayName : a.displayRelationship).toLowerCase();
      const bValue = (sortField === "name" ? b.displayName : b.displayRelationship).toLowerCase();
      if (aValue === bValue) return 0;
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [people, searchTerm, sortField, sortDirection]);

  const totalCount = people.length;

  return (
    <div className="flex min-h-screen items-center justify-center font-sans p-4" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <main className="flex w-full max-w-5xl flex-col gap-6 rounded-lg shadow-lg p-6 sm:p-8" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Enrolled Faces
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Enrolled people: {totalCount}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchEnrolledPeople}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-primary)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-primary)")}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg font-medium transition-colors border text-center"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Go to Face Enroll
            </Link>
          </div>
        </div>

        <div className="w-full flex flex-col gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search by name or relationship"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
              style={{
                borderColor: "var(--border-primary)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                "--tw-ring-color": "var(--focus-ring)",
              } as CSSProperties}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort("name")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
                backgroundColor: sortField === "name" ? "var(--bg-tertiary)" : "var(--bg-primary)",
              }}
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by Name {sortField === "name" ? (sortDirection === "asc" ? "(A-Z)" : "(Z-A)") : ""}
            </button>
            <button
              onClick={() => handleSort("relationship")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
                backgroundColor: sortField === "relationship" ? "var(--bg-tertiary)" : "var(--bg-primary)",
              }}
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by Relationship {sortField === "relationship" ? (sortDirection === "asc" ? "(A-Z)" : "(Z-A)") : ""}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 p-4 rounded-lg"
            style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: "var(--error-icon)" }} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 p-10" style={{ color: "var(--text-secondary)" }}>
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Loading enrolled people...</p>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 p-10 rounded-lg border text-center"
            style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
          >
            <Users className="w-12 h-12" />
            <div>
              <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
                You haven&apos;t enrolled anyone yet.
              </p>
              <p>Add someone to see them listed here.</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg font-medium transition-colors border"
              style={{
                borderColor: "var(--border-primary)",
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Go to Face Enroll
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ color: "var(--text-secondary)" }}>
                  <th className="py-3 px-4 border-b" style={{ borderColor: "var(--border-primary)" }}>Person</th>
                  <th className="py-3 px-4 border-b" style={{ borderColor: "var(--border-primary)" }}>Relationship</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr key={person.id} style={{ color: "var(--text-primary)" }}>
                    <td className="py-3 px-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
                      <div className="flex items-center gap-3">
                        {person.avatarUrl ? (
                          <img
                            src={person.avatarUrl}
                            alt={person.displayName}
                            className="w-12 h-12 rounded-full object-cover border"
                            style={{ borderColor: "var(--border-primary)" }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
                            style={{
                              backgroundColor: "var(--bg-tertiary)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {person.initials}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{person.displayName}</p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {person.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-b" style={{ borderColor: "var(--border-primary)" }}>
                      {person.displayRelationship || "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

