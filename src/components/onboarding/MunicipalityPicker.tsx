
import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import {
  getMunicipalityIndex,
  findMunicipalityByCoords,
  searchMunicipalities,
  type MunicipalityEntry,
} from "../../lib/queries/municipality-index";

type LocationData = {
  lat: number;
  lon: number;
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
  detectionMethod: "gps" | "ip" | "manual";
};

type StatusState =
  | { type: "idle" }
  | { type: "loading"; message: string }
  | { type: "success"; title: string; message?: string }
  | { type: "error"; title: string; message?: string };


function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}


function StatusBanner({ status }: { status: StatusState }) {
  if (status.type === "idle") return null;
  if (status.type === "loading") {
    return (
      <div className="mt-4 p-4 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        <Spinner className="h-5 w-5 shrink-0" />
        <p className="font-semibold text-sm">{status.message}</p>
      </div>
    );
  }
  const isError = status.type === "error";
  const colors = isError
    ? "bg-red-50 text-red-800 border-red-200"
    : "bg-green-50 text-green-800 border-green-200";
  const icon = isError ? "⚠️" : "✅";
  return (
    <div
      className={`mt-4 p-4 rounded-lg border ${colors} flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <span className="text-lg select-none">{icon}</span>
      <div>
        <p className="font-bold text-sm">{status.title}</p>
        {status.message && (
          <p className="text-xs mt-1 opacity-90">{status.message}</p>
        )}
      </div>
    </div>
  );
}

type GpsState = "idle" | "detecting" | "found" | "error";

type PickerState = {
  index: MunicipalityEntry[];
  indexLoaded: boolean;
  indexError: boolean;
  query: string;
  results: MunicipalityEntry[];
  showResults: boolean;
  selected: MunicipalityEntry | null;
  gpsState: GpsState;
  status: StatusState;
};

type PickerAction =
  | { type: "INDEX_SUCCESS"; payload: MunicipalityEntry[] }
  | { type: "INDEX_ERROR" }
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_RESULTS"; payload: MunicipalityEntry[] }
  | { type: "SET_SHOW_RESULTS"; payload: boolean }
  | { type: "SET_SELECTED"; payload: MunicipalityEntry | null }
  | { type: "GPS_SET_STATE"; payload: { gpsState: GpsState; status: StatusState } };

const pickerReducer = (state: PickerState, action: PickerAction): PickerState => {
  switch (action.type) {
    case "INDEX_SUCCESS":
      return {
        ...state,
        index: action.payload,
        indexLoaded: true,
        indexError: false,
      };
    case "INDEX_ERROR":
      return {
        ...state,
        index: [],
        indexLoaded: true,
        indexError: true,
      };
    case "SET_QUERY":
      return { ...state, query: action.payload };
    case "SET_RESULTS":
      return { ...state, results: action.payload };
    case "SET_SHOW_RESULTS":
      return { ...state, showResults: action.payload };
    case "SET_SELECTED":
      return { ...state, selected: action.payload };
    case "GPS_SET_STATE":
      return {
        ...state,
        gpsState: action.payload.gpsState,
        status: action.payload.status,
      };
    default:
      return state;
  }
};

export default function MunicipalityPicker() {
  const [state, dispatch] = useReducer(pickerReducer, {
    index: [],
    indexLoaded: false,
    indexError: false,
    query: "",
    results: [],
    showResults: false,
    selected: null,
    gpsState: "idle",
    status: { type: "idle" },
  });

  const {
    index,
    indexLoaded,
    indexError,
    query,
    results,
    showResults,
    selected,
    gpsState,
    status,
  } = state;

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMunicipalityIndex()
      .then((data) => {
        dispatch({ type: "INDEX_SUCCESS", payload: data });
      })
      .catch(() => {
        dispatch({ type: "INDEX_ERROR" });
      });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        dispatch({ type: "SET_SHOW_RESULTS", payload: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      if (!indexLoaded || !index.length) return;

      dispatch({ type: "SET_QUERY", payload: value });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const matches = searchMunicipalities(index, value);
        dispatch({ type: "SET_RESULTS", payload: matches });
        dispatch({ type: "SET_SHOW_RESULTS", payload: true });
      }, 250);
    },
    [index, indexLoaded],
  );

  const handleFocus = useCallback(() => {
    if (!indexLoaded || !index.length) return;
    const matches = searchMunicipalities(index, query);
    dispatch({ type: "SET_RESULTS", payload: matches });
    dispatch({ type: "SET_SHOW_RESULTS", payload: true });
  }, [index, indexLoaded, query]);

  const handleSelect = (item: MunicipalityEntry) => {
    dispatch({ type: "SET_SELECTED", payload: item });
    dispatch({ type: "SET_QUERY", payload: item.name });
    dispatch({ type: "SET_SHOW_RESULTS", payload: false });
  };

  const handleGpsClick = useCallback(async () => {
    if (gpsState === "detecting") return;
    dispatch({
      type: "GPS_SET_STATE",
      payload: {
        gpsState: "detecting",
        status: { type: "loading", message: "Detectando ubicación..." },
      },
    });

    let idx = index;
    if (!indexLoaded || !idx.length) {
      try {
        idx = await getMunicipalityIndex();
        dispatch({ type: "INDEX_SUCCESS", payload: idx });
      } catch {
        dispatch({
          type: "GPS_SET_STATE",
          payload: {
            gpsState: "error",
            status: {
              type: "error",
              title: "Error de datos",
              message: "No se pudo cargar el índice de municipios.",
            },
          },
        });
        return;
      }
    }

    if (!navigator.geolocation) {
      dispatch({
        type: "GPS_SET_STATE",
        payload: {
          gpsState: "error",
          status: {
            type: "error",
            title: "No soportado",
            message: "Tu navegador no soporta geolocalización. Busca manualmente.",
          },
        },
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            enableHighAccuracy: false,
            maximumAge: 300_000,
          });
        },
      );

      const { latitude, longitude } = position.coords;
      dispatch({
        type: "GPS_SET_STATE",
        payload: {
          gpsState,
          status: { type: "loading", message: "Buscando municipio..." },
        },
      });

      const found = await findMunicipalityByCoords(latitude, longitude);

      if (found) {
        const locationData: LocationData = {
          lat: latitude,
          lon: longitude,
          municipalityId: found.id,
          municipalityName: found.name,
          departmentName: found.department,
          detectionMethod: "gps",
        };
        localStorage.setItem(
          "user_location",
          JSON.stringify({ lat: latitude, lon: longitude }),
        );
        localStorage.setItem(
          "detected_municipality",
          JSON.stringify(locationData),
        );

        dispatch({
          type: "GPS_SET_STATE",
          payload: {
            gpsState: "found",
            status: {
              type: "success",
              title: "Ubicación detectada",
              message: `Municipio: ${found.name}`,
            },
          },
        });

        setTimeout(() => {
          const base = import.meta.env.PUBLIC_BASE_URL ?? "/";
          const baseRoute = import.meta.env.PUBLIC_BASE_ROUTE ?? "/";
          window.location.href = `${base.replace(/\/$/, "")}${baseRoute.replace(/\/$/, "")}/onboarding/3`;
        }, 900);
      } else {
        throw new Error("out-of-range");
      }
    } catch (err: unknown) {
      let msg = "No pudimos detectar tu ubicación. Busca manualmente abajo.";
      if (err && typeof err === "object" && "code" in err) {
        const geoErr = err as GeolocationPositionError;
        if (geoErr.code === 1)
          msg = "Necesitamos permiso para usar tu ubicación. Busca manualmente.";
        else if (geoErr.code === 3)
          msg = "GPS tardó demasiado. Busca tu municipio manualmente.";
      } else if (err instanceof Error && err.message === "out-of-range") {
        msg =
          "No encontramos tu municipio. ¿Estás en Bolivia? Busca manualmente.";
      }

      dispatch({
        type: "GPS_SET_STATE",
        payload: {
          gpsState: "error",
          status: { type: "error", title: "Error de ubicación", message: msg },
        },
      });
    }
  }, [gpsState, index, indexLoaded]);

  const handleContinue = () => {
    if (!selected) return;

    const locationData: LocationData = {
      lat: 0,
      lon: 0,
      municipalityId: selected.id,
      municipalityName: selected.name,
      departmentName: selected.department,
      detectionMethod: "manual",
    };
    localStorage.setItem(
      "detected_municipality",
      JSON.stringify(locationData),
    );

    const base = import.meta.env.PUBLIC_BASE_URL ?? "/";
    const baseRoute = import.meta.env.PUBLIC_BASE_ROUTE ?? "/";
    window.location.href = `${base.replace(/\/$/, "")}${baseRoute.replace(/\/$/, "")}/onboarding/3`;
  };

  const gpsButtonContent = () => {
    if (gpsState === "detecting") {
      return (
        <>
          <span className="flex items-center gap-2">
            <Spinner />
            <span>Detectando ubicación...</span>
          </span>
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </>
      );
    }
    if (gpsState === "found") {
      return <span>✅ ¡Municipio encontrado!</span>;
    }
    const label = gpsState === "error" ? "Intentar de nuevo" : "Usar mi ubicación";
    return (
      <>
        <span className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span>{label}</span>
        </span>
        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
      </>
    );
  };

  const inputPlaceholder = indexError
    ? "Error al cargar municipios"
    : indexLoaded
      ? "Buscar municipio..."
      : "Cargando municipios...";

  return (
    <div className="space-y-4">
      <StatusBanner status={status} />

      {/* GPS button */}
      <button
        onClick={handleGpsClick}
        disabled={gpsState === "detecting" || gpsState === "found"}
        className={`w-full group p-5 rounded-2xl font-bold text-lg flex items-center justify-between hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait ${gpsState === "found"
          ? "bg-green-600 text-white shadow-lg scale-[1.02] justify-center disabled:opacity-100"
          : "bg-primary-green text-hunter hover:shadow-primary-green/30 disabled:opacity-70"
          }`}
      >
        {gpsButtonContent()}
      </button>

      {/* Search + continue */}
      <div className="w-full space-y-3 relative">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-green/40 pointer-events-none">
            {indexLoaded ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            ) : (
              <Spinner className="h-4 w-4" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder={inputPlaceholder}
            disabled={!indexLoaded || indexError}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={handleFocus}
            className="w-full bg-white border-2 border-primary-green/10 text-primary-green pl-12 pr-4 py-4 rounded-2xl font-semibold text-base placeholder:text-primary-green/40 focus:outline-none focus:border-primary-green/30 focus:shadow-lg focus:shadow-primary-green/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />

          {showResults && results.length > 0 && (
            <div
              ref={resultsRef}
              className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-primary-green/10 rounded-2xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-primary-green/5"
            >
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left px-5 py-4 hover:bg-primary-green/5 transition-all text-primary-green group animate-in fade-in duration-200"
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg group-hover:translate-x-1 transition-transform">
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold border border-primary-green/20 px-2 py-0.5 rounded-full">
                      {item.department}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && indexLoaded && results.length === 0 && query.trim() && (
            <div
              ref={resultsRef}
              className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-primary-green/10 rounded-2xl shadow-xl z-50"
            >
              <div className="p-4 text-sm text-primary-green/50 text-center font-medium">
                No encontramos municipios con ese nombre.
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full bg-primary-green/5 p-5 rounded-2xl font-bold text-lg hover:bg-primary-green/10 text-primary-green transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
        >
          <span>Continuar</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
