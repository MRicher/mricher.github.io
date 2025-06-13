<?php

function fetchPage($url) {
    $context = stream_context_create(['http' => ['header' => 'User-Agent: Mozilla/5.0']]);
    $html = @file_get_contents($url, false, $context);
    return $html ?: null;
}

function parseHtml($html) {
    if (!$html) return null;

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    if (!$doc->loadHTML($html)) {
        libxml_clear_errors();
        return null;
    }
    libxml_clear_errors();
    return new DOMXPath($doc);
}

function extractDateFromTitle($title) {
    // Match something like "6 am June 11 to 6 am June 12"
    if (preg_match('/6\s*(a\.?m\.?)?\s*(\w+)\s+(\d{1,2})\s+to\s+6\s*(a\.?m\.?)?\s*(\w+)\s+(\d{1,2})/i', $title, $matches)) {
        // Start date
        $monthStart = $matches[2]; // e.g., "June"
        $dayStart = $matches[3];   // e.g., "11"
        return DateTime::createFromFormat('F j Y', "$monthStart $dayStart 2025");
    }
    return null;
}

function extractSections($xpath) {
    $sections = [];
    $headers = $xpath->query('//h2 | //h3');

    $priorityCount = 0;

    foreach ($headers as $header) {
        $title = trim($header->textContent);

        // Priorities
        if (stripos($title, 'priority') !== false && $priorityCount < 4) {
            $priorityCount++;
            $p = $header->nextSibling;
            while ($p && $p->nodeName !== 'p') {
                $p = $p->nextSibling;
            }
            if ($p) {
                $sections["priority$priorityCount"] = trim($p->textContent);
            }
        }

        // Region blocks
        $regionMatch = matchRegion($title);
        if ($regionMatch) {
            $p = $header->nextSibling;
            while ($p && $p->nodeName !== 'p') {
                $p = $p->nextSibling;
            }
            if ($p) {
                $sections[$regionMatch][] = [
                    'detachment' => $title,
                    'text' => trim($p->textContent)
                ];
            }
        }
    }

    return $sections;
}

function matchRegion($title) {
    $map = [
        "Northeast" => ['Bathurst', 'Campbellton', 'Caraquet', 'Tracadie'],
        "Southeast" => ['Richibucto', 'Shediac', 'Elsipogtog', 'Bouctouche'],
        "West" => ['Oromocto', 'Woodstock', 'St. Stephen', 'Keswick'],
        "Codiac" => ['Codiac', 'Moncton', 'Dieppe', 'Riverview']
    ];

    foreach ($map as $region => $keywords) {
        foreach ($keywords as $keyword) {
            if (stripos($title, $keyword) !== false) {
                return $region;
            }
        }
    }

    return null;
}

function buildJson($date, $nextDate, $sectionsEn, $sectionsFr) {
    $data = [
        "date" => $date,
        "nextDay" => $nextDate,
        "priorities" => [
            "priority1" => $sectionsEn["priority1"] ?? "",
            "priority2" => $sectionsEn["priority2"] ?? "",
            "priority3" => $sectionsEn["priority3"] ?? "",
            "priority4" => $sectionsEn["priority4"] ?? ""
        ],
        "regions" => [
            "Northeast" => [],
            "Southeast" => [],
            "West" => [],
            "Codiac" => []
        ]
    ];

    foreach (["Northeast", "Southeast", "West", "Codiac"] as $region) {
        $en = $sectionsEn[$region] ?? [];
        $fr = $sectionsFr[$region] ?? [];

        for ($i = 0; $i < min(count($en), count($fr)); $i++) {
            $data["regions"][$region][] = [
                "detachment-en" => $en[$i]["detachment"] ?? "",
                "detachment-fr" => $fr[$i]["detachment"] ?? "",
                "en" => $en[$i]["text"] ?? "",
                "fr" => $fr[$i]["text"] ?? ""
            ];
        }
    }

    return $data;
}

// --- Main Execution ---

$urlEn = "https://www.rcmp-grc.gc.ca/en/news/2025/daily-occurrence-report-6-am-june-11-6-am-june-12";
$urlFr = "https://www.rcmp-grc.gc.ca/fr/nouvelles/2025/rapport-quotidien-des-incidents-6-h-11-juin-a-6-h-12-juin";

// Fetch pages
$htmlEn = fetchPage($urlEn);
$htmlFr = fetchPage($urlFr);

if (!$htmlEn || !$htmlFr) {
    die("Failed to load one or both pages.\n");
}

// Parse into DOM
$xpathEn = parseHtml($htmlEn);
$xpathFr = parseHtml($htmlFr);

if (!$xpathEn || !$xpathFr) {
    die("Failed to parse one or both HTML documents.\n");
}

// Extract date from English title
$titleNode = $xpathEn->query('//h1')->item(0);
if (!$titleNode) {
    die("Could not find <h1> title on English page.\n");
}

$titleText = trim($titleNode->textContent);
$dateObj = extractDateFromTitle($titleText);

if (!$dateObj) {
    die("Could not parse date from title: \"$titleText\"\n");
}

$dateStr = $dateObj->format('Y-m-d');
$nextDateStr = $dateObj->modify('+1 day')->format('Y-m-d');
$filename = "nb-$dateStr.json";

// Parse content
$sectionsEn = extractSections($xpathEn);
$sectionsFr = extractSections($xpathFr);

// Build and save JSON
$jsonData = buildJson($dateStr, $nextDateStr, $sectionsEn, $sectionsFr);
file_put_contents($filename, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo "✅ Saved report to $filename\n";
