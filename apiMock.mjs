// @ts-nocheck
import express from 'express';

const app = express();
app.use(express.json());

// API "defectuosa" construida según las reglas erradas del PO
app.post('/api/v1/beneficios/calcular', (req, res) => {
    try {
        const { sbm, gradoIncapacidad, opciones } = req.body;

        // Validación básica
        if (typeof sbm !== 'number' || typeof gradoIncapacidad !== 'number') {
            return res.status(400).json({ error: 'Parámetros inválidos' });
        }

        // TRAMO 1: Sin beneficio
        if (gradoIncapacidad < 15) {
            return res.json({ tipoBeneficio: 'NINGUNO', monto: 0, periodicidad: null });
        }

        // TRAMO 2: Indemnización Global
        if (gradoIncapacidad < 40) {
            let factor = 0;
            if (gradoIncapacidad < 17.5) factor = 1.5;
            else if (gradoIncapacidad < 20) factor = 3.0;
            else if (gradoIncapacidad < 22.5) factor = 4.5;
            else if (gradoIncapacidad < 25) factor = 6.0;
            else if (gradoIncapacidad < 27.5) factor = 7.5;
            else if (gradoIncapacidad < 30) factor = 9.0;
            else if (gradoIncapacidad < 32.5) factor = 10.5;
            else if (gradoIncapacidad < 35) factor = 12.0;
            else if (gradoIncapacidad < 37.5) factor = 13.5;
            else factor = 15.0;

            return res.json({
                tipoBeneficio: 'INDEMNIZACION_GLOBAL',
                monto: sbm * factor,
                periodicidad: 'PAGO_UNICO'
            });
        }

        // TRAMO 3: Pensión Parcial
        if (gradoIncapacidad < 70) {
            return res.json({
                tipoBeneficio: 'PENSION_PARCIAL',
                monto: sbm * 0.30,
                periodicidad: 'MENSUAL'
            });
        }

        // TRAMO 4: Pensión Total
        let montoBase = sbm * 0.70;

        if (opciones && opciones.granInvalidez) {
            montoBase += sbm * 0.30;
        }

        return res.json({
            tipoBeneficio: 'PENSION_TOTAL',
            monto: montoBase,
            periodicidad: 'MENSUAL'
        });

    } catch (error) {
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Mock API "Defectuosa" de ACHS corriendo en http://localhost:${PORT}`);
    console.log(`Endpoint disponible: POST http://localhost:${PORT}/api/v1/beneficios/calcular`);
});
