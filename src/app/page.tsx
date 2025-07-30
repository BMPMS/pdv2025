'use client'
import indicatorData from "./data/allIndicatorData.json";
import themeData from "./data/allThemes.json"
import allData from "./data/allData.json"
import countryData from "./data/population.json";
import countryGeoJson from "./data/boundaryGeojson.json";
import {DataEntry, EEZGeoJSON, FormattedData} from "@/types";
import React, {useRef, useState} from "react";
import ThemesPanel from "@/app/components/ThemesPanel";
import MapPanel from "@/app/components/MapPanel";
import StatusPanel from "@/app/components/StatusPanel";
import {formatData, getFilteredChartData} from "@/app/dataFunctions"
import ProgressPanel from "@/app/components/ProgressPanel";


export default  function Home() {

    const allChartData = formatData(indicatorData,allData as DataEntry[]);
    const [chartData, setChartData] = useState<FormattedData[]>(allChartData);
    const selectedTheme: React.RefObject<number>  = useRef(-1);
    const selectedCountryOrRegion: React.RefObject<string>  = useRef("|");


    const regionSet = [...new Set(countryData.map((m) => m.Region))];
    const countryMapper = regionSet.reduce((acc, entry) => {
        acc[entry] = countryData
            .filter((f) => f.Region === entry)
            .map((m) => m.ISOCode);
        return acc;
    },{} as {[key: string]: string[]});


    const filterByTheme = (themeIndex: number) => {
        selectedTheme.current = themeIndex;
        const newChartData = getFilteredChartData(
            selectedTheme.current,
            selectedCountryOrRegion.current,
            allChartData,
            countryMapper
        );
        setChartData(newChartData);
    }

    const filterByCountryOrRegion = (filterVar: string, filterType: string) => {

        selectedCountryOrRegion.current = `${filterVar}|${filterType}`;
        const newChartData = getFilteredChartData(
            selectedTheme.current,
            selectedCountryOrRegion.current,
            allChartData,
            countryMapper
        );
        setChartData(newChartData);
    }

  return (
      <> <div className={"chartTooltip"}></div>
          <div className="w-screen h-screen  bg-white flex flex-col  p-0">
          <div className="sticky top-0 z-10 flex h-[min(30vh,25vw)] w-full   p-0">
              <div className="w-1/3 flex flex-col  p-0">
                  <div className="h-1/2  bg-white p-1"><img src="/BP2050-Logo.png" alt="BP2050 Logo"  className="ml-4 w-full h-full object-left object-contain"/></div>
                  <div className="h-1/2 bg-white  p-0"><ThemesPanel themeData={themeData} filterByTheme={filterByTheme}></ThemesPanel></div>
              </div>
              <div className="w-2/3 bg-white  p-0"><MapPanel countryData={countryData} filterByCountryOrRegion={filterByCountryOrRegion} countryGeoJson={countryGeoJson as EEZGeoJSON}></MapPanel></div>
          </div>
              <div className="flex flex-col divide-y md:divide-y-0 md:divide-x divide-gray-300 md:flex-row h-[calc(100vh_-_min(30vh,_25vw))] w-full p-0">
                  <div className="w-full md:w-1/2 h-full min-h-[350px] md:min-h-0 flex flex-col bg-white p-0">
                      <StatusPanel chartData={chartData} />
                  </div>
                  <div className="w-full md:w-1/2 h-full min-h-[350px] md:min-h-0 flex flex-col bg-white p-0">
                      <ProgressPanel chartData={chartData} />
                  </div>
              </div>
      </div>
     </>

  );
}
