python D:\dev\www\lib\closure\library\closure\bin\build\closurebuilder.py ^
   		--root D:\dev\www\lib\closure\library ^
   		--root ..\.. ^
         --namespace ag ^
         --namespace ag.bio.primer.ThermodynamicCalculator ^
   		--output_mode compiled ^
   		--compiler_jar D:\dev\www\lib\closure\compiler\compiler.jar ^
         --compiler_flags="--js=thermo-harness.js" ^
         --compiler_flags="--compilation_level=ADVANCED_OPTIMIZATIONS" > ThermodynamicCalculator_test-compiled.js


::       --compiler_flags="--formatting=PRETTY_PRINT" ^
