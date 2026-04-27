import React, { useMemo, useState } from 'react';
import { FiTarget, FiCheckCircle, FiAlertCircle, FiZap } from 'react-icons/fi';

/* ------------------------------------------------------------------ */
/*  Role → skill knowledge base                                        */
/*  Skills are curated from GitHub Copilot's training knowledge of     */
/*  industry job requirements. They reflect common patterns seen in    */
/*  job postings but are NOT sourced from a live database.             */
/* ------------------------------------------------------------------ */
interface RoleEntry { skills: string[]; source: string }

const SOURCE = 'Curated from AI training data (common patterns in industry job postings)';

const ROLE_SKILL_MAP: Record<string, RoleEntry> = {
    frontend: {
        skills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Tailwind',
            'Next.js', 'Redux', 'Webpack', 'Jest', 'Accessibility', 'REST APIs'],
        source: SOURCE,
    },
    backend: {
        skills: ['Python', 'Node.js', 'SQL', 'PostgreSQL', 'REST APIs', 'GraphQL',
            'Docker', 'AWS', 'Redis', 'Microservices', 'CI/CD', 'Linux'],
        source: SOURCE,
    },
    fullstack: {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'REST APIs',
            'Docker', 'AWS', 'Git', 'Tailwind', 'PostgreSQL', 'CI/CD'],
        source: SOURCE,
    },
    'full stack': {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'REST APIs',
            'Docker', 'AWS', 'Git', 'Tailwind', 'PostgreSQL', 'CI/CD'],
        source: SOURCE,
    },
    'data scien': {
        skills: ['Python', 'Pandas', 'NumPy', 'SQL', 'Scikit-learn', 'Statistics',
            'Machine Learning', 'Jupyter', 'Tableau', 'A/B Testing', 'PyTorch', 'TensorFlow'],
        source: SOURCE,
    },
    'data analy': {
        skills: ['SQL', 'Python', 'Excel', 'Tableau', 'Power BI', 'Statistics',
            'Pandas', 'A/B Testing', 'Data Visualization', 'ETL'],
        source: SOURCE,
    },
    'machine learning': {
        skills: ['Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'NumPy',
            'Pandas', 'Linear Algebra', 'Deep Learning', 'MLOps', 'AWS',
            'Statistics', 'Hugging Face'],
        source: SOURCE,
    },
    'ml engineer': {
        skills: ['Python', 'PyTorch', 'TensorFlow', 'MLOps', 'Docker', 'Kubernetes',
            'AWS', 'SQL', 'Airflow', 'Spark', 'CI/CD', 'Model Deployment'],
        source: SOURCE,
    },
    devops: {
        skills: ['Linux', 'Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD',
            'Bash', 'Python', 'Monitoring', 'Prometheus', 'Ansible', 'Git'],
        source: SOURCE,
    },
    cloud: {
        skills: ['AWS', 'GCP', 'Azure', 'Terraform', 'Docker', 'Kubernetes',
            'Linux', 'Python', 'Networking', 'IAM', 'CI/CD'],
        source: SOURCE,
    },
    mobile: {
        skills: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'iOS', 'Android',
            'REST APIs', 'Git', 'Firebase', 'UI Design'],
        source: SOURCE,
    },
    ios: {
        skills: ['Swift', 'SwiftUI', 'Xcode', 'Objective-C', 'Core Data', 'REST APIs', 'UIKit'],
        source: SOURCE,
    },
    android: {
        skills: ['Kotlin', 'Java', 'Android Studio', 'Jetpack Compose', 'REST APIs', 'Gradle'],
        source: SOURCE,
    },
    'product manag': {
        skills: ['Product Strategy', 'Roadmapping', 'A/B Testing', 'SQL',
            'User Research', 'Wireframing', 'Agile', 'Stakeholder Mgmt',
            'Analytics', 'Communication'],
        source: SOURCE,
    },
    ux: {
        skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping',
            'Design Systems', 'Accessibility', 'Usability Testing', 'Interaction Design'],
        source: SOURCE,
    },
    ui: {
        skills: ['Figma', 'CSS', 'Design Systems', 'Prototyping', 'Typography',
            'Color Theory', 'Adobe XD'],
        source: SOURCE,
    },
    security: {
        skills: ['Networking', 'Linux', 'Python', 'Cryptography', 'OWASP',
            'Penetration Testing', 'SIEM', 'Cloud Security', 'Bash'],
        source: SOURCE,
    },
    'software eng': {
        skills: ['Data Structures', 'Algorithms', 'Git', 'System Design',
            'Python', 'Java', 'SQL', 'REST APIs', 'Testing', 'Docker'],
        source: SOURCE,
    },
    game: {
        skills: ['C++', 'C#', 'Unity', 'Unreal Engine', '3D Math', 'Shaders', 'Git', 'OOP'],
        source: SOURCE,
    },
    embedded: {
        skills: ['C', 'C++', 'RTOS', 'ARM', 'Microcontrollers', 'Linux', 'Git'],
        source: SOURCE,
    },
    research: {
        skills: ['Python', 'PyTorch', 'LaTeX', 'Statistics', 'Linear Algebra',
            'Research Methods', 'Technical Writing'],
        source: SOURCE,
    },
    // ── Pharmaceutical & Life Sciences ──────────────────────────────────
    pharma: {
        skills: ['GMP', 'GDP', 'ICH Guidelines', 'FDA Regulations', 'HPLC',
            'Analytical Chemistry', 'Documentation', 'SOP Writing', 'Excel',
            'Statistical Analysis', 'Python', 'Lab Techniques'],
        source: SOURCE,
    },
    pharmaceutical: {
        skills: ['GMP', 'GDP', 'ICH Guidelines', 'FDA Regulations', 'HPLC',
            'Analytical Chemistry', 'Documentation', 'SOP Writing', 'Excel',
            'Statistical Analysis', 'Python', 'Lab Techniques'],
        source: SOURCE,
    },
    'clinical trial': {
        skills: ['GCP', 'ICH E6 Guidelines', 'Protocol Development', 'EDC Systems',
            'Medidata Rave', 'Regulatory Submissions', 'Informed Consent',
            'Risk-Based Monitoring', 'SAS', 'Medical Writing'],
        source: SOURCE,
    },
    'clinical research': {
        skills: ['GCP', 'ICH E6 Guidelines', 'Protocol Development', 'EDC Systems',
            'Medidata Rave', 'Regulatory Submissions', 'Informed Consent',
            'Risk-Based Monitoring', 'SAS', 'Medical Writing'],
        source: SOURCE,
    },
    regulatory: {
        skills: ['FDA Regulations', 'EU MDR / IVDR', 'ICH Guidelines', 'CTD Submissions',
            'eCTD', 'Risk Management (ISO 14971)', 'SOP Writing', 'Veeva Vault',
            'Technical Writing', 'Gap Analysis'],
        source: SOURCE,
    },
    'drug discovery': {
        skills: ['Medicinal Chemistry', 'ADMET', 'In Vitro Assays', 'HTS',
            'Chemoinformatics', 'Python', 'Schrödinger Suite', 'MOE',
            'Structure-Activity Relationship', 'Lab Techniques'],
        source: SOURCE,
    },
    biotech: {
        skills: ['Molecular Biology', 'PCR', 'Cell Culture', 'ELISA', 'Flow Cytometry',
            'Bioreactor Operation', 'GMP', 'Python', 'Statistical Analysis',
            'Technical Writing'],
        source: SOURCE,
    },
    'medicinal chem': {
        skills: ['Organic Synthesis', 'Medicinal Chemistry', 'NMR', 'HPLC',
            'Structure-Activity Relationship', 'Chemoinformatics', 'SciFinder',
            'Reaxys', 'Lab Notebook', 'GMP'],
        source: SOURCE,
    },
    pharmacovigilance: {
        skills: ['Adverse Event Reporting', 'MedDRA Coding', 'ICH E2 Guidelines',
            'Signal Detection', 'Oracle Argus', 'ARISg', 'Medical Writing',
            'Epidemiology', 'Excel', 'SQL'],
        source: SOURCE,
    },
    'medical affairs': {
        skills: ['Medical Writing', 'KOL Engagement', 'Publication Planning',
            'Health Economics', 'Clinical Data Interpretation', 'Regulatory Knowledge',
            'Communication', 'Presentation Skills'],
        source: SOURCE,
    },
    bioinformatics: {
        skills: ['Python', 'R', 'Bioconductor', 'BLAST', 'NGS Analysis',
            'Linux/Bash', 'SQL', 'Statistics', 'Genomics', 'Proteomics',
            'Snakemake', 'Machine Learning'],
        source: SOURCE,
    },
    'computational bio': {
        skills: ['Python', 'R', 'Molecular Dynamics', 'GROMACS', 'AlphaFold',
            'Statistics', 'Machine Learning', 'Linux/Bash', 'Structural Biology'],
        source: SOURCE,
    },
    formulation: {
        skills: ['Solid Dosage Forms', 'Lyophilization', 'Stability Studies',
            'GMP', 'Analytical Chemistry', 'HPLC', 'QbD', 'DoE',
            'JMP / Minitab', 'Technical Writing'],
        source: SOURCE,
    },
    'quality assurance': {
        skills: ['GMP', 'GDP', 'Deviation Management', 'CAPA', 'Change Control',
            'Audit Management', 'Risk Assessment', 'SOP Writing', 'ERP Systems',
            'Statistical Process Control'],
        source: SOURCE,
    },
};

const DEFAULT_ENTRY: RoleEntry = {
    skills: ['Git', 'Data Structures', 'Algorithms', 'Communication',
        'Problem Solving', 'SQL', 'Python', 'REST APIs'],
    source: SOURCE,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const norm = (s: string) => s.toLowerCase().trim();

function getRoleEntry(dreamRole: string | null | undefined): { skills: string[]; source: string } {
    if (!dreamRole) return DEFAULT_ENTRY;
    const role = norm(dreamRole);
    const collectedSkills = new Set<string>();
    let source = '';
    for (const key of Object.keys(ROLE_SKILL_MAP)) {
        if (role.includes(key)) {
            ROLE_SKILL_MAP[key].skills.forEach((s) => collectedSkills.add(s));
            if (!source) source = ROLE_SKILL_MAP[key].source;
        }
    }
    if (collectedSkills.size === 0) return DEFAULT_ENTRY;
    return { skills: Array.from(collectedSkills), source };
}

interface Skill { id: number; name: string }

export interface LiveSkillData {
    skills: string[];
    source: string;
    grounding_urls?: { title: string; url: string }[];
}

interface Props {
    skills: Skill[];
    dreamRole?: string | null;
    size?: 'sm' | 'lg';
    /** When provided, overrides the static skill map with live Gemini data */
    liveData?: LiveSkillData | null;
}

interface Node {
    label: string;
    x: number;
    y: number;
    matched: boolean;   // user has it AND it's recommended
    owned: boolean;     // user has it (but maybe not in recommended list)
    missing: boolean;   // recommended but user lacks it
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const SkillGalaxy: React.FC<Props> = ({ skills, dreamRole = 'sm', liveData }) => {
    const [hovered, setHovered] = useState<string | null>(null);

    const { nodes, matchPercent, matchedCount, recommendedCount, missingSkills, dataSource, groundingUrls } = useMemo(() => {
        // Prefer live Gemini data; fall back to static map
        const recommended = liveData?.skills.length
            ? liveData.skills
            : getRoleEntry(dreamRole).skills;
        const dataSource = liveData?.source || getRoleEntry(dreamRole).source;
        const groundingUrls = liveData?.grounding_urls ?? [];

        const recSet = new Set(recommended.map(norm));
        const ownedSet = new Set(skills.map((s) => norm(s.name)));

        const matched = recommended.filter((r) => ownedSet.has(norm(r)));
        const missing = recommended.filter((r) => !ownedSet.has(norm(r)));
        const extras = skills.filter((s) => !recSet.has(norm(s.name))).map((s) => s.name);

        // Layout: 3 concentric orbits
        //  inner  -> matched (closest to dream job core)
        //  middle -> missing (required but not yet acquired)
        //  outer  -> extras (your other skills)
        const center = { x: 250, y: 250 };
        const radii = { matched: 90, missing: 155, extras: 215 };

        const place = (items: string[], radius: number, offset = 0): Node[] =>
            items.map((label, i) => {
                const angle = (i / Math.max(items.length, 1)) * Math.PI * 2 + offset;
                return {
                    label,
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius,
                    matched: recSet.has(norm(label)) && ownedSet.has(norm(label)),
                    owned: ownedSet.has(norm(label)),
                    missing: recSet.has(norm(label)) && !ownedSet.has(norm(label)),
                };
            });

        const nodes: Node[] = [
            ...place(matched, radii.matched, -Math.PI / 2),
            ...place(missing, radii.missing, -Math.PI / 2 + 0.2),
            ...place(extras, radii.extras, -Math.PI / 2 + 0.4),
        ];

        const matchPercent = recommended.length
            ? Math.round((matched.length / recommended.length) * 100)
            : 0;

        return {
            nodes,
            matchPercent,
            matchedCount: matched.length,
            recommendedCount: recommended.length,
            missingSkills: missing,
            dataSource,
            groundingUrls,
        };
    }, [skills, dreamRole, liveData]);

    const dreamLabel = dreamRole?.trim() || 'Set a dream role';

    return (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                <div>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FiZap className="text-indigo-500" />
                        Skill Galaxy
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                        A live map of how your skills orbit your dream role.
                    </p>
                    {dataSource && (
                        <div className="mt-2 space-y-1">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-2.5 py-1 text-[10px] text-slate-500 dark:text-white/35">
                                <svg className="w-2.5 h-2.5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 16 16">
                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M8 5v1M8 8v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <span>{dataSource}</span>
                            </div>
                            {groundingUrls.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {groundingUrls.map((g) => (
                                        <a
                                            key={g.url}
                                            href={g.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:opacity-80 transition-opacity"
                                        >
                                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 16 16">
                                                <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            {g.title.length > 40 ? g.title.slice(0, 40) + '…' : g.title}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                        {matchPercent}%
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-white/40">
                        {matchedCount} / {recommendedCount} core skills
                    </div>
                </div>
            </div>

            {/* Galaxy SVG */}
            <div className="relative w-full rounded-xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-950/40 dark:via-indigo-950/20 dark:to-violet-950/30 border border-slate-100 dark:border-white/5">
                <svg viewBox="-40 -40 580 580" className="w-full h-auto block">
                    <defs>
                        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
                            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="matchedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* twinkling background dots */}
                    {Array.from({ length: 40 }).map((_, i) => {
                        const x = (i * 73) % 500;
                        const y = (i * 131) % 500;
                        return (
                            <circle
                                key={`star-${i}`}
                                cx={x}
                                cy={y}
                                r={i % 5 === 0 ? 1.4 : 0.7}
                                className="fill-slate-300 dark:fill-white/30"
                                opacity={0.4}
                            />
                        );
                    })}

                    {/* Orbit rings */}
                    {[90, 155, 215].map((r, idx) => (
                        <circle
                            key={`orbit-${r}`}
                            cx={250}
                            cy={250}
                            r={r}
                            fill="none"
                            className={
                                idx === 1
                                    ? 'stroke-amber-300/40 dark:stroke-amber-500/30'
                                    : 'stroke-indigo-300/40 dark:stroke-indigo-400/20'
                            }
                            strokeWidth={1}
                            strokeDasharray={idx === 1 ? '4 4' : '2 6'}
                        />
                    ))}

                    {/* Core: dream role */}
                    <circle cx={250} cy={250} r={70} fill="url(#coreGrad)" />
                    <circle
                        cx={250}
                        cy={250}
                        r={36}
                        className="fill-indigo-500 dark:fill-indigo-500"
                        filter="url(#glow)"
                    />
                    <foreignObject x={170} y={232} width={160} height={40}>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-white text-[10px] uppercase tracking-wider opacity-80">
                                <FiTarget className="w-3 h-3" />
                                Dream Role
                            </div>
                            <div className="text-white font-bold text-xs leading-tight truncate px-1">
                                {dreamLabel}
                            </div>
                        </div>
                    </foreignObject>

                    {/* Connection lines from core to matched skills */}
                    {nodes.filter((n) => n.matched).map((n) => (
                        <line
                            key={`link-${n.label}`}
                            x1={250}
                            y1={250}
                            x2={n.x}
                            y2={n.y}
                            className="stroke-indigo-400/40 dark:stroke-indigo-400/30"
                            strokeWidth={1}
                        />
                    ))}

                    {/* Skill nodes */}
                    {nodes.map((n) => {
                        const isHovered = hovered === n.label;
                        const radius = isHovered ? 9 : 7;
                        return (
                            <g
                                key={n.label}
                                onMouseEnter={() => setHovered(n.label)}
                                onMouseLeave={() => setHovered(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {n.matched && (
                                    <circle
                                        cx={n.x}
                                        cy={n.y}
                                        r={radius + 5}
                                        fill="url(#matchedGrad)"
                                        opacity={0.25}
                                    />
                                )}
                                <circle
                                    cx={n.x}
                                    cy={n.y}
                                    r={radius}
                                    className={
                                        n.matched
                                            ? 'fill-indigo-500 stroke-white dark:stroke-slate-900'
                                            : n.missing
                                            ? 'fill-transparent stroke-amber-400 dark:stroke-amber-300'
                                            : 'fill-slate-400 dark:fill-white/40 stroke-white dark:stroke-slate-900'
                                    }
                                    strokeWidth={n.missing ? 2 : 1.5}
                                    strokeDasharray={n.missing ? '3 2' : undefined}
                                    filter={n.matched ? 'url(#glow)' : undefined}
                                />
                                {/* Label */}
                                <text
                                    x={n.x}
                                    y={n.y - radius - 6}
                                    textAnchor="middle"
                                    className={
                                        n.matched
                                            ? 'fill-indigo-700 dark:fill-indigo-200 font-semibold'
                                            : n.missing
                                            ? 'fill-amber-700 dark:fill-amber-300'
                                            : 'fill-slate-600 dark:fill-white/60'
                                    }
                                    style={{
                                        fontSize: isHovered ? 12 : 10,
                                        transition: 'font-size 120ms',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {n.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow shadow-indigo-500/50" />
                    Matched ({matchedCount})
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-white/40 inline-block" />
                    Your other skills
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 inline-block" />
                    Missing for dream role ({missingSkills.length})
                </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">
                        <FiCheckCircle /> Strengths for {dreamLabel}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {nodes.filter((n) => n.matched).length === 0 && (
                            <span className="text-xs text-slate-500 dark:text-white/40">
                                Add skills below to start matching your dream role.
                            </span>
                        )}
                        {nodes.filter((n) => n.matched).map((n) => (
                            <span
                                key={`s-${n.label}`}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 border border-indigo-500/20"
                            >
                                {n.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold mb-1">
                        <FiAlertCircle /> Suggested next skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {missingSkills.length === 0 ? (
                            <span className="text-xs text-slate-500 dark:text-white/40">
                                You're covering the core skills for this role. Nice!
                            </span>
                        ) : (
                            missingSkills.slice(0, 8).map((m) => (
                                <span
                                    key={`m-${m}`}
                                    className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-amber-400/70 text-amber-700 dark:text-amber-200"
                                >
                                    {m}
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillGalaxy;
